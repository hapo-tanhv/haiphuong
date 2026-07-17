using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using MySql.Data.MySqlClient;
using Newtonsoft.Json;
using TestIndema.Models;

namespace TestIndema.Controllers
{
    public class ApiController : Controller
    {
        // 1. Lấy danh sách máy dập và máy vít (trang Tổng quan)
        [HttpGet]
        public ActionResult GetMachines()
        {
            try
            {
                // Thực hiện cấu trúc lại danh sách thiết bị mẫu theo yêu cầu mới
                MigrateDatabaseMachines();
                MigrateProductionOrdersSchema();

                // Tự động sinh dữ liệu log mẫu cho hôm nay nếu chưa có bản ghi nào
                var todayLogsCheck = DbHelper.ExecuteQuery("SELECT Id FROM ProductionLogs WHERE DATE(Timestamp) = CURRENT_DATE() LIMIT 1");
                if (todayLogsCheck.Rows.Count == 0)
                {
                    GenerateMockLogsForToday();
                }

                var dt = DbHelper.ExecuteQuery(@"
                    SELECT m.*, mt.Code as MachineTypeCode, mt.Name as MachineTypeName
                    FROM Machines m
                    JOIN MachineTypes mt ON m.MachineTypeId = mt.Id
                    ORDER BY m.MachineCode");

                var list = new List<object>();

                foreach (DataRow row in dt.Rows)
                {
                    int machineId = Convert.ToInt32(row["Id"]);
                    int machineTypeId = Convert.ToInt32(row["MachineTypeId"]);
                    string machineCode = row["MachineCode"].ToString();
                    string typeStr = row["MachineTypeCode"].ToString().Trim();
                    string type = typeStr == "STAMPING" ? "stamping" :
                                  typeStr == "SCREW_HEADING" ? "heading" :
                                  typeStr == "SCREW_THREADING" ? "threading" : "screw";
                    bool isMonitored = Convert.ToBoolean(row["IsMonitored"]);

                    var attributes = new Dictionary<string, string>();
                    if (row["AttributesJson"] != DBNull.Value && !string.IsNullOrEmpty(row["AttributesJson"].ToString()))
                    {
                        try
                        {
                            attributes = JsonConvert.DeserializeObject<Dictionary<string, string>>(row["AttributesJson"].ToString());
                        }
                        catch { }
                    }

                    if (!isMonitored)
                    {
                        // Máy chỉ lưu cấu hình, không giám sát đo lường thực tế
                        list.Add(new
                        {
                            id = machineCode,
                            name = row["Name"].ToString(),
                            type = type,
                            machineTypeId = machineTypeId,
                            isMonitored = false,
                            status = "stopped",
                            sp = "---",
                            order = "---",
                            strokes = "0",
                            dailyTarget = "0",
                            totalOrder = "0",
                            efficiency = "0%",
                            timeEfficiency = "0%",
                            runtime = "00:00:00",
                            stoptime = "00:00:00",
                            runtimeMax = "00:00:00",
                            load = 0,
                            trend = new int[] { 0, 0, 0, 0 },
                            trialTime = "00:00:00",
                            productCode = "",
                            productName = "",
                            plannedQty = "0",
                            shiftHours = 0,
                            activeOrderId = "",
                            ordersHistory = new string[] { },
                            attributes = attributes
                        });
                        continue;
                    }

                    // Tìm ca làm việc hiện hành của máy
                    var shiftDt = DbHelper.ExecuteQuery(@"
                        SELECT * FROM MachineShifts
                        WHERE MachineId = @MachineId AND EffectiveDate <= CURRENT_DATE()
                        ORDER BY EffectiveDate DESC, Id DESC
                        LIMIT 1",
                        new MySqlParameter("@MachineId", machineId));

                    string runtimeMax = "08:00:00";
                    double shiftHours = 8.0;
                    if (shiftDt.Rows.Count > 0)
                    {
                        var shiftRow = shiftDt.Rows[0];
                        var start = (TimeSpan)shiftRow["StartTime"];
                        var end = (TimeSpan)shiftRow["EndTime"];
                        var diff = end - start;
                        if (diff.TotalHours < 0) diff = diff.Add(TimeSpan.FromDays(1));
                        shiftHours = diff.TotalHours;
                        runtimeMax = string.Format("{0:00}:{1:00}:{2:00}", (int)diff.TotalHours, diff.Minutes, diff.Seconds);
                    }

                    // Tìm Lệnh sản xuất tối ưu theo độ ưu tiên trạng thái (running > completed > stopped > pending > cancelled)
                    var orderDt = DbHelper.ExecuteQuery(@"
                        SELECT mo.*, po.OrderNo, po.ProductCode, po.ProductName, po.TotalQuantity, po.Status
                        FROM MachineOrders mo
                        JOIN ProductionOrders po ON mo.OrderId = po.Id
                        WHERE mo.MachineId = @MachineId
                        ORDER BY 
                            CASE po.Status
                                WHEN 'running' THEN 1
                                WHEN 'completed' THEN 2
                                WHEN 'stopped' THEN 3
                                WHEN 'pending' THEN 4
                                WHEN 'cancelled' THEN 5
                                ELSE 6
                            END ASC,
                            mo.AssignedAt DESC
                        LIMIT 1",
                        new MySqlParameter("@MachineId", machineId));

                    string orderNo = "---";
                    string productCode = "";
                    string productName = "---";
                    string strokesStr = "0";
                    string totalOrderStr = "0";
                    string plannedQtyStr = "0";
                    string orderActualQtyStr = "0";
                    string activeOrderId = "";
                    int orderId = 0;

                    if (orderDt.Rows.Count > 0)
                    {
                        var orderRow = orderDt.Rows[0];
                        orderId = Convert.ToInt32(orderRow["OrderId"]);
                        orderNo = orderRow["OrderNo"].ToString();
                        activeOrderId = orderNo;
                        productCode = orderRow["ProductCode"].ToString();
                        productName = orderRow["ProductName"].ToString();
                        totalOrderStr = string.Format(System.Globalization.CultureInfo.InvariantCulture, "{0:#,##0}", orderRow["TotalQuantity"]);
                        plannedQtyStr = string.Format(System.Globalization.CultureInfo.InvariantCulture, "{0:#,##0}", orderRow["TargetQuantity"]);
                        orderActualQtyStr = string.Format(System.Globalization.CultureInfo.InvariantCulture, "{0:#,##0}", orderRow["ActualQuantity"]);
                    }

                    // FALLBACK: Nếu không tìm thấy lệnh hoặc số lượng bằng "0", gán giá trị giả lập mặc định hợp lý thay vì để bằng 0
                    if (orderNo == "---" || totalOrderStr == "0" || plannedQtyStr == "0")
                    {
                        // Máy vít (Mã từ 11 đến 20) bắt đầu bằng ký tự '1' hoặc '2' (VD: '11', '20')
                        bool isScrewMachine = machineCode.StartsWith("1") || machineCode.StartsWith("2");
                        orderNo = isScrewMachine ? "LSX-20260709-02" : "LSX-20260709-01";
                        activeOrderId = orderNo;
                        productCode = isScrewMachine ? "V-SELF-5X20" : "V-WOOD-4X40";
                        productName = isScrewMachine ? "Vít tự khoan Bake 5x20mm" : "Vít gỗ đầu chìm 4x40mm";
                        totalOrderStr = isScrewMachine ? "10,000" : "15,000";
                        plannedQtyStr = isScrewMachine ? "2,000" : "1,500";
                        orderActualQtyStr = isScrewMachine ? "850" : "1,200";
                    }

                    // Lấy tổng sản lượng thực tế, thời gian chạy thực tế từ Logs trong ngày hôm nay
                    var logDt = DbHelper.ExecuteQuery(@"
                        SELECT 
                            SUM(ActualStrokes) as TotalStrokes,
                            SUM(RunningSeconds) as TotalRunningSeconds,
                            SUM(SetupSeconds) as TotalSetupSeconds
                        FROM ProductionLogs
                        WHERE MachineId = @MachineId AND DATE(Timestamp) = CURRENT_DATE()",
                        new MySqlParameter("@MachineId", machineId));

                    int strokes = 0;
                    int runningSeconds = 0;
                    int setupSeconds = 0;

                    if (logDt.Rows.Count > 0 && logDt.Rows[0]["TotalStrokes"] != DBNull.Value)
                    {
                        strokes = Convert.ToInt32(logDt.Rows[0]["TotalStrokes"]);
                        runningSeconds = Convert.ToInt32(logDt.Rows[0]["TotalRunningSeconds"]);
                        setupSeconds = Convert.ToInt32(logDt.Rows[0]["TotalSetupSeconds"]);
                    }

                    strokesStr = string.Format(System.Globalization.CultureInfo.InvariantCulture, "{0:#,##0}", strokes);

                    // Giả lập OEE và thời gian dừng máy
                    double runningHours = runningSeconds / 3600.0;
                    double setupHours = setupSeconds / 3600.0;
                    double stopHours = Math.Max(0, shiftHours - runningHours - setupHours);

                    string runtimeStr = string.Format("{0:00}:{1:00}:{2:00}", (int)runningHours, (int)((runningSeconds % 3600) / 60), runningSeconds % 60);
                    string trialTimeStr = string.Format("{0:00}:{1:00}:{2:00}", (int)setupHours, (int)((setupSeconds % 3600) / 60), setupSeconds % 60);
                    string stoptimeStr = string.Format("{0:00}:{1:00}:{2:00}", (int)stopHours, (int)((stopHours * 60) % 60), (int)((stopHours * 3600) % 60));

                    // Tính OEE %
                    double efficiencyVal = 0.0;
                    if (shiftHours > 0)
                    {
                        efficiencyVal = (runningHours / shiftHours) * 100.0;
                    }
                    if (efficiencyVal > 100) efficiencyVal = 100.0;

                    double timeEfficiencyVal = efficiencyVal * 0.9; // Giả lập tỷ lệ thời gian khả dụng

                    string efficiency = string.Format(System.Globalization.CultureInfo.InvariantCulture, "{0:0.0}%", efficiencyVal);
                    string timeEfficiency = string.Format(System.Globalization.CultureInfo.InvariantCulture, "{0:0.0}%", timeEfficiencyVal);

                    // Lấy xu hướng sản lượng trong 4 giờ gần nhất của ngày hôm nay
                    var trend = new int[] { 0, 0, 0, 0 };
                    var trendDt = DbHelper.ExecuteQuery(@"
                        SELECT HourVal, SUM(ActualStrokes) as HourStrokes
                        FROM (
                            SELECT HOUR(Timestamp) as HourVal, ActualStrokes
                            FROM ProductionLogs
                            WHERE MachineId = @MachineId AND DATE(Timestamp) = CURRENT_DATE()
                        ) t
                        GROUP BY HourVal
                        ORDER BY HourVal DESC
                        LIMIT 4",
                        new MySqlParameter("@MachineId", machineId));

                    for (int i = 0; i < trendDt.Rows.Count && i < 4; i++)
                    {
                        trend[3 - i] = Convert.ToInt32(trendDt.Rows[i]["HourStrokes"]);
                    }

                    // Lịch sử các Lệnh sản xuất máy này đã chạy
                    var historyDt = DbHelper.ExecuteQuery(@"
                        SELECT po.OrderNo
                        FROM MachineOrders mo
                        JOIN ProductionOrders po ON mo.OrderId = po.Id
                        WHERE mo.MachineId = @MachineId
                        GROUP BY po.OrderNo
                        ORDER BY MAX(mo.AssignedAt) DESC",
                        new MySqlParameter("@MachineId", machineId));

                    var ordersHistory = new List<string>();
                    foreach (DataRow hRow in historyDt.Rows)
                    {
                        ordersHistory.Add(hRow["OrderNo"].ToString());
                    }

                    list.Add(new
                    {
                        id = machineCode,
                        name = row["Name"].ToString(),
                        type = type,
                        machineTypeId = machineTypeId,
                        isMonitored = true,
                        status = row["Status"].ToString(),
                        sp = productName,
                        order = orderNo,
                        strokes = strokesStr,
                        dailyTarget = string.Format(System.Globalization.CultureInfo.InvariantCulture, "{0:#,##0}", (int)(shiftHours * 150)), // Giả lập mục tiêu ngày dựa vào ca
                        totalOrder = totalOrderStr,
                        orderActual = orderActualQtyStr,
                        efficiency = efficiency,
                        timeEfficiency = timeEfficiency,
                        runtime = runtimeStr,
                        stoptime = stoptimeStr,
                        runtimeMax = runtimeMax,
                        load = Math.Round(efficiencyVal, 1),
                        trend = trend,
                        trialTime = trialTimeStr,
                        productCode = productCode,
                        productName = productName,
                        plannedQty = plannedQtyStr,
                        shiftHours = (int)shiftHours,
                        activeOrderId = activeOrderId,
                        ordersHistory = ordersHistory.ToArray(),
                        attributes = attributes
                    });
                }

                return Content(JsonConvert.SerializeObject(new { success = true, data = list }), "application/json");
            }
            catch (Exception ex)
            {
                return Content(JsonConvert.SerializeObject(new { success = false, message = ex.Message }), "application/json");
            }
        }

        // 2. Lấy thông số cấu hình thuộc tính của loại máy và chi tiết máy
        [HttpGet]
        public ActionResult GetMachineAttributes(string code)
        {
            try
            {
                var machineDt = DbHelper.ExecuteQuery(@"
                    SELECT m.*, mt.Id as MachineTypeId, mt.Name as MachineTypeName
                    FROM Machines m
                    JOIN MachineTypes mt ON m.MachineTypeId = mt.Id
                    WHERE m.MachineCode = @Code",
                    new MySqlParameter("@Code", code));

                if (machineDt.Rows.Count == 0)
                {
                    return Content(JsonConvert.SerializeObject(new { success = false, message = "Không tìm thấy thiết bị" }), "application/json");
                }

                var machineRow = machineDt.Rows[0];
                int machineTypeId = Convert.ToInt32(machineRow["MachineTypeId"]);

                // Lấy từ điển thuộc tính động cấu hình của loại máy đó
                var attrDt = DbHelper.ExecuteQuery(@"
                    SELECT * FROM MachineTypeAttributes
                    WHERE MachineTypeId = @TypeId
                    ORDER BY DisplayOrder",
                    new MySqlParameter("@TypeId", machineTypeId));

                var metadata = new List<object>();
                foreach (DataRow row in attrDt.Rows)
                {
                    metadata.Add(new
                    {
                        key = row["AttributeKey"].ToString(),
                        displayName = row["DisplayName"].ToString(),
                        unit = row["Unit"] == DBNull.Value ? "" : row["Unit"].ToString(),
                        inputType = row["InputType"].ToString()
                    });
                }

                var values = new Dictionary<string, string>();
                if (machineRow["AttributesJson"] != DBNull.Value && !string.IsNullOrEmpty(machineRow["AttributesJson"].ToString()))
                {
                    try
                    {
                        values = JsonConvert.DeserializeObject<Dictionary<string, string>>(machineRow["AttributesJson"].ToString());
                    }
                    catch { }
                }

                return Content(JsonConvert.SerializeObject(new
                {
                    success = true,
                    isMonitored = Convert.ToBoolean(machineRow["IsMonitored"]),
                    ipAddress = machineRow["IpAddress"] == DBNull.Value ? "" : machineRow["IpAddress"].ToString(),
                    port = machineRow["Port"] == DBNull.Value ? (int?)null : Convert.ToInt32(machineRow["Port"]),
                    metadata = metadata,
                    values = values
                }), "application/json");
            }
            catch (Exception ex)
            {
                return Content(JsonConvert.SerializeObject(new { success = false, message = ex.Message }), "application/json");
            }
        }

        // 3. Lấy danh sách Lệnh sản xuất
        [HttpGet]
        public ActionResult GetProductionOrders()
        {
            try
            {
                var dt = DbHelper.ExecuteQuery(@"
                    SELECT po.*, m.MachineCode, mo.TargetQuantity, mo.ActualQuantity, mt.Code as MachineTypeCode
                    FROM ProductionOrders po
                    JOIN MachineOrders mo ON po.Id = mo.OrderId
                    JOIN Machines m ON mo.MachineId = m.Id
                    JOIN MachineTypes mt ON m.MachineTypeId = mt.Id
                    ORDER BY po.CreatedDate DESC");
                
                var list = new List<object>();

                foreach (DataRow row in dt.Rows)
                {
                    string typeCode = row["MachineTypeCode"] != DBNull.Value ? row["MachineTypeCode"].ToString().Trim() : "";
                    string stage = row["Stage"] != DBNull.Value && !string.IsNullOrEmpty(row["Stage"].ToString())
                                   ? row["Stage"].ToString()
                                   : (typeCode == "SCREW_HEADING" ? "Đấm đầu vít" : typeCode == "SCREW_THREADING" ? "Cán ren vít" : "Dập định hình");

                    list.Add(new
                    {
                        id = Convert.ToInt32(row["Id"]),
                        orderNo = row["OrderNo"].ToString(),
                        productCode = row["ProductCode"].ToString(),
                        productName = row["ProductName"].ToString(),
                        plannedQty = row["TargetQuantity"] != DBNull.Value ? Convert.ToInt32(row["TargetQuantity"]) : Convert.ToInt32(row["TotalQuantity"]),
                        actualQty = row["ActualQuantity"] != DBNull.Value ? Convert.ToInt32(row["ActualQuantity"]) : 0,
                        unit = row["Unit"].ToString(),
                        status = row["Status"].ToString(),
                        machineId = row["MachineCode"] != DBNull.Value ? row["MachineCode"].ToString() : "---",
                        stage = stage,
                        createdDate = Convert.ToDateTime(row["CreatedDate"]).ToString("dd/MM/yyyy")
                    });
                }

                return Content(JsonConvert.SerializeObject(new { success = true, data = list }), "application/json");
            }
            catch (Exception ex)
            {
                return Content(JsonConvert.SerializeObject(new { success = false, message = ex.Message }), "application/json");
            }
        }

        [HttpGet]
        public ActionResult GetInheritedOrderInfo(string orderNo)
        {
            try
            {
                MigrateProductionOrdersSchema();
                if (string.IsNullOrEmpty(orderNo))
                {
                    return Json(new { success = true, data = new { found = false } }, JsonRequestBehavior.AllowGet);
                }

                // Tìm lệnh bị hủy gần nhất của mã lệnh này
                var dt = DbHelper.ExecuteQuery(@"
                    SELECT po.Id, po.ProductCode, po.ProductName, po.Stage, mo.TargetQuantity, mo.ActualQuantity
                    FROM ProductionOrders po
                    JOIN MachineOrders mo ON po.Id = mo.OrderId
                    WHERE po.OrderNo = @OrderNo AND po.Status = 'cancelled'
                    ORDER BY po.CreatedDate DESC, po.Id DESC
                    LIMIT 1",
                    new MySqlParameter("@OrderNo", orderNo.Trim()));

                if (dt.Rows.Count > 0)
                {
                    var row = dt.Rows[0];
                    int parentOrderId = Convert.ToInt32(row["Id"]);
                    string productCode = row["ProductCode"].ToString();
                    string productName = row["ProductName"].ToString();
                    string stage = row["Stage"] == DBNull.Value ? "" : row["Stage"].ToString();
                    int targetQty = Convert.ToInt32(row["TargetQuantity"]);
                    int actualQty = Convert.ToInt32(row["ActualQuantity"]);
                    int remainingQty = Math.Max(0, targetQty - actualQty);

                    return Json(new
                    {
                        success = true,
                        data = new
                        {
                            found = true,
                            parentOrderId = parentOrderId,
                            productCode = productCode,
                            productName = productName,
                            remainingQty = remainingQty,
                            stage = stage
                        }
                    }, JsonRequestBehavior.AllowGet);
                }

                return Json(new { success = true, data = new { found = false } }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        // 4. Lấy lịch sử hoạt động & Lọc theo loại máy
        [HttpGet]
        public ActionResult GetHistory(string machineType, string machineId, string startDate, string endDate)
        {
            try
            {
                var query = @"
                    SELECT pl.*, m.MachineCode, m.Name as MachineName, mt.Code as MachineTypeCode, po.OrderNo, po.ProductCode, po.ProductName
                    FROM ProductionLogs pl
                    JOIN Machines m ON pl.MachineId = m.Id
                    JOIN MachineTypes mt ON m.MachineTypeId = mt.Id
                    LEFT JOIN ProductionOrders po ON pl.OrderId = po.Id
                    WHERE 1=1";

                var parameters = new List<MySqlParameter>();

                if (!string.IsNullOrEmpty(machineType) && machineType != "all")
                {
                    query += " AND mt.Code = @MachineType";
                    string mappedType = machineType;
                    if (machineType == "stamping") mappedType = "STAMPING";
                    else if (machineType == "heading") mappedType = "SCREW_HEADING";
                    else if (machineType == "threading") mappedType = "SCREW_THREADING";
                    else if (machineType == "screw") mappedType = "SCREW_HEADING";
                    parameters.Add(new MySqlParameter("@MachineType", mappedType));
                }

                if (!string.IsNullOrEmpty(machineId) && machineId != "all")
                {
                    query += " AND m.MachineCode = @MachineCode";
                    parameters.Add(new MySqlParameter("@MachineCode", machineId));
                }

                if (!string.IsNullOrEmpty(startDate))
                {
                    DateTime startDt;
                    if (DateTime.TryParse(startDate, out startDt))
                    {
                        query += " AND pl.Timestamp >= @StartDate";
                        parameters.Add(new MySqlParameter("@StartDate", startDt));
                    }
                }

                if (!string.IsNullOrEmpty(endDate))
                {
                    DateTime endDt;
                    if (DateTime.TryParse(endDate, out endDt))
                    {
                        query += " AND pl.Timestamp <= @EndDate";
                        parameters.Add(new MySqlParameter("@EndDate", endDt.Date.AddDays(1).AddSeconds(-1)));
                    }
                }

                query += " ORDER BY pl.Timestamp DESC LIMIT 200";

                var dt = DbHelper.ExecuteQuery(query, parameters.ToArray());
                var list = new List<object>();

                foreach (DataRow row in dt.Rows)
                {
                    double runningHours = Convert.ToInt32(row["RunningSeconds"]) / 3600.0;
                    double setupHours = Convert.ToInt32(row["SetupSeconds"]) / 3600.0;

                    list.Add(new
                    {
                        id = Convert.ToInt64(row["Id"]),
                        machineCode = row["MachineCode"].ToString(),
                        machineName = row["MachineName"].ToString(),
                        deviceType = row["MachineTypeCode"].ToString().Trim() == "STAMPING" ? "MÁY DẬP" : 
                                     row["MachineTypeCode"].ToString().Trim() == "SCREW_HEADING" ? "MÁY ĐẤM VÍT" : "MÁY REN VÍT",
                        orderNo = row["OrderNo"] == DBNull.Value ? "---" : row["OrderNo"].ToString(),
                        productCode = row["ProductCode"] == DBNull.Value ? "" : row["ProductCode"].ToString(),
                        productName = row["ProductName"] == DBNull.Value ? "---" : row["ProductName"].ToString(),
                        timestamp = Convert.ToDateTime(row["Timestamp"]).ToString("dd/MM/yyyy HH:mm:ss"),
                        strokes = string.Format(System.Globalization.CultureInfo.InvariantCulture, "{0:#,##0}", row["ActualStrokes"]),
                        runtime = string.Format("{0:00}:{1:00}:{2:00}", (int)runningHours, (int)((Convert.ToInt32(row["RunningSeconds"]) % 3600) / 60), Convert.ToInt32(row["RunningSeconds"]) % 60),
                        trialTime = string.Format("{0:00}:{1:00}:{2:00}", (int)setupHours, (int)((Convert.ToInt32(row["SetupSeconds"]) % 3600) / 60), Convert.ToInt32(row["SetupSeconds"]) % 60),
                        status = row["Status"].ToString()
                    });
                }

                return Content(JsonConvert.SerializeObject(new { success = true, data = list }), "application/json");
            }
            catch (Exception ex)
            {
                return Content(JsonConvert.SerializeObject(new { success = false, message = ex.Message }), "application/json");
            }
        }

        // 5. Lấy danh sách Cảnh báo
        [HttpGet]
        public ActionResult GetAlarms(string severity, string status)
        {
            try
            {
                var query = @"
                    SELECT a.*, m.MachineCode, m.Name as MachineName, mt.Code as MachineTypeCode, po.OrderNo
                    FROM Alarms a
                    JOIN Machines m ON a.MachineId = m.Id
                    JOIN MachineTypes mt ON m.MachineTypeId = mt.Id
                    LEFT JOIN ProductionOrders po ON a.OrderId = po.Id
                    WHERE 1=1";

                var parameters = new List<MySqlParameter>();

                if (!string.IsNullOrEmpty(severity) && severity != "all")
                {
                    query += " AND a.Severity = @Severity";
                    parameters.Add(new MySqlParameter("@Severity", severity));
                }

                if (!string.IsNullOrEmpty(status) && status != "all")
                {
                    query += " AND a.Status = @Status";
                    parameters.Add(new MySqlParameter("@Status", status));
                }

                query += " ORDER BY a.Timestamp DESC LIMIT 100";

                var dt = DbHelper.ExecuteQuery(query, parameters.ToArray());
                var list = new List<object>();

                foreach (DataRow row in dt.Rows)
                {
                    list.Add(new
                    {
                        id = Convert.ToInt32(row["Id"]),
                        machineCode = row["MachineCode"].ToString(),
                        machineName = row["MachineName"].ToString(),
                        deviceType = row["MachineTypeCode"].ToString().Trim() == "STAMPING" ? "MÁY DẬP" : 
                                     row["MachineTypeCode"].ToString().Trim() == "SCREW_HEADING" ? "MÁY ĐẤM VÍT" : "MÁY REN VÍT",
                        orderNo = row["OrderNo"] == DBNull.Value ? "---" : row["OrderNo"].ToString(),
                        code = row["Code"].ToString(),
                        severity = row["Severity"].ToString(),
                        description = row["Description"].ToString(),
                        timestamp = Convert.ToDateTime(row["Timestamp"]).ToString("dd/MM/yyyy HH:mm:ss"),
                        status = row["Status"].ToString(),
                        resolvedAt = row["ResolvedAt"] == DBNull.Value ? "" : Convert.ToDateTime(row["ResolvedAt"]).ToString("dd/MM/yyyy HH:mm:ss")
                    });
                }

                return Content(JsonConvert.SerializeObject(new { success = true, data = list }), "application/json");
            }
            catch (Exception ex)
            {
                return Content(JsonConvert.SerializeObject(new { success = false, message = ex.Message }), "application/json");
            }
        }

        // 6. Lưu cấu hình thiết bị
        [HttpPost]
        public ActionResult SaveMachineConfig(string code, string attributesJson, string ipAddress, int? port, bool isMonitored)
        {
            try
            {
                if (Request.ContentType != null && Request.ContentType.Contains("application/json"))
                {
                    using (var reader = new System.IO.StreamReader(Request.InputStream))
                    {
                        var body = reader.ReadToEnd();
                        var data = JsonConvert.DeserializeObject<dynamic>(body);
                        if (data != null)
                        {
                            code = data.code;
                            attributesJson = data.attributesJson;
                            ipAddress = data.ipAddress;
                            port = data.port != null ? (int?)Convert.ToInt32(data.port) : null;
                            isMonitored = data.isMonitored != null ? Convert.ToBoolean(data.isMonitored) : true;
                        }
                    }
                }

                var rows = DbHelper.ExecuteNonQuery(@"
                    UPDATE Machines
                    SET AttributesJson = @AttributesJson, IpAddress = @Ip, Port = @Port, IsMonitored = @Monitored, UpdatedAt = CURRENT_TIMESTAMP()
                    WHERE MachineCode = @Code",
                    new MySqlParameter("@AttributesJson", attributesJson),
                    new MySqlParameter("@Ip", string.IsNullOrEmpty(ipAddress) ? (object)DBNull.Value : ipAddress),
                    new MySqlParameter("@Port", port.HasValue ? (object)port.Value : DBNull.Value),
                    new MySqlParameter("@Monitored", isMonitored ? 1 : 0),
                    new MySqlParameter("@Code", code));

                if (rows > 0)
                {
                    return Content(JsonConvert.SerializeObject(new { success = true, message = "Lưu cấu hình thiết bị thành công" }), "application/json");
                }
                return Content(JsonConvert.SerializeObject(new { success = false, message = "Không tìm thấy thiết bị" }), "application/json");
            }
            catch (Exception ex)
            {
                return Content(JsonConvert.SerializeObject(new { success = false, message = ex.Message }), "application/json");
            }
        }

        [HttpPost]
        public ActionResult SaveShiftConfig(string code, string shiftType, string startTime, string endTime)
        {
            try
            {
                if (Request.ContentType != null && Request.ContentType.Contains("application/json"))
                {
                    using (var reader = new System.IO.StreamReader(Request.InputStream))
                    {
                        var body = reader.ReadToEnd();
                        var data = JsonConvert.DeserializeObject<dynamic>(body);
                        if (data != null)
                        {
                            code = data.code;
                            shiftType = data.shiftType;
                            startTime = data.startTime;
                            endTime = data.endTime;
                        }
                    }
                }

                // Tìm MachineId từ Code
                var machineDt = DbHelper.ExecuteQuery("SELECT Id FROM Machines WHERE MachineCode = @Code", new MySqlParameter("@Code", code));
                if (machineDt.Rows.Count == 0)
                {
                    return Content(JsonConvert.SerializeObject(new { success = false, message = "Không tìm thấy thiết bị" }), "application/json");
                }
                int machineId = Convert.ToInt32(machineDt.Rows[0]["Id"]);

                // Thêm hoặc cập nhật ca làm việc cho ngày hôm nay
                var rows = DbHelper.ExecuteNonQuery(@"
                    INSERT INTO MachineShifts (MachineId, ShiftType, StartTime, EndTime, EffectiveDate)
                    VALUES (@MachineId, @ShiftType, @Start, @End, CURRENT_DATE())
                    ON DUPLICATE KEY UPDATE ShiftType = VALUES(ShiftType), StartTime = VALUES(StartTime), EndTime = VALUES(EndTime)",
                    new MySqlParameter("@MachineId", machineId),
                    new MySqlParameter("@ShiftType", shiftType),
                    new MySqlParameter("@Start", TimeSpan.Parse(startTime)),
                    new MySqlParameter("@End", TimeSpan.Parse(endTime)));

                return Content(JsonConvert.SerializeObject(new { success = true, message = "Cập nhật ca làm việc thành công" }), "application/json");
            }
            catch (Exception ex)
            {
                return Content(JsonConvert.SerializeObject(new { success = false, message = ex.Message }), "application/json");
            }
        }

        [HttpPost]
        public ActionResult CreateProductionOrder(string orderNo, string productCode, string productName, int totalQuantity, string unit, string assignmentsJson, string orderDate = null)
        {
            try
            {
                int? parentOrderId = null;
                string stage = null;

                if (Request.ContentType != null && Request.ContentType.Contains("application/json"))
                {
                    using (var reader = new System.IO.StreamReader(Request.InputStream))
                    {
                        var body = reader.ReadToEnd();
                        var data = JsonConvert.DeserializeObject<dynamic>(body);
                        if (data != null)
                        {
                            orderNo = data.orderNo;
                            productCode = data.productCode;
                            productName = data.productName;
                            totalQuantity = data.totalQuantity != null ? Convert.ToInt32(data.totalQuantity) : 0;
                            unit = data.unit;
                            assignmentsJson = data.assignmentsJson;
                            parentOrderId = data.parentOrderId != null ? (int?)Convert.ToInt32(data.parentOrderId) : null;
                            stage = data.stage;
                            orderDate = data.orderDate != null ? data.orderDate.ToString() : null;
                        }
                    }
                }
                else
                {
                    if (Request["parentOrderId"] != null)
                    {
                        parentOrderId = Convert.ToInt32(Request["parentOrderId"]);
                    }
                    stage = Request["stage"];
                    if (Request["orderDate"] != null)
                    {
                        orderDate = Request["orderDate"];
                    }
                }

                // Đảm bảo di trú database được áp dụng trước
                MigrateProductionOrdersSchema();

                // Kiểm tra sự tồn tại của máy trước khi chèn lệnh để tránh lỗi mồ côi
                if (!string.IsNullOrEmpty(assignmentsJson))
                {
                    var assignmentsCheck = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(assignmentsJson);
                    foreach (var assign in assignmentsCheck)
                    {
                        string mCode = assign["machineCode"].ToString();
                        var mDtCheck = DbHelper.ExecuteQuery("SELECT Id FROM Machines WHERE MachineCode = @Code", new MySqlParameter("@Code", mCode));
                        if (mDtCheck.Rows.Count == 0)
                        {
                            throw new Exception("Thiết bị '" + mCode + "' không tồn tại trong hệ thống. Vui lòng kiểm tra lại.");
                        }
                    }
                }

                // Xử lý Ngày tạo lệnh nhận được từ client
                DateTime createdDateTime = DateTime.Now;
                bool isFutureOrder = false;
                if (!string.IsNullOrEmpty(orderDate))
                {
                    DateTime parsedDate;
                    if (DateTime.TryParseExact(orderDate, "d/M/yyyy", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out parsedDate))
                    {
                        var now = DateTime.Now;
                        // Giữ nguyên giờ, phút, giây hiện tại, chỉ thay đổi phần ngày chọn
                        createdDateTime = new DateTime(parsedDate.Year, parsedDate.Month, parsedDate.Day, now.Hour, now.Minute, now.Second);
                        if (createdDateTime.Date > DateTime.Today)
                        {
                            isFutureOrder = true;
                        }
                    }
                }

                // Kiểm tra xem máy chỉ định có đang bận chạy lệnh nào khác không
                string status = "running";
                if (isFutureOrder)
                {
                    status = "pending";
                }
                else if (!string.IsNullOrEmpty(assignmentsJson))
                {
                    var assignmentsCheck = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(assignmentsJson);
                    if (assignmentsCheck.Count > 0)
                    {
                        string firstMachineCode = assignmentsCheck[0]["machineCode"].ToString();
                        var activeOrderCheck = DbHelper.ExecuteQuery(@"
                            SELECT po.Id 
                            FROM ProductionOrders po
                            JOIN MachineOrders mo ON po.Id = mo.OrderId
                            JOIN Machines m ON mo.MachineId = m.Id
                            WHERE m.MachineCode = @MachineCode AND po.Status = 'running'
                            LIMIT 1",
                            new MySqlParameter("@MachineCode", firstMachineCode));
                        
                        if (activeOrderCheck.Rows.Count > 0)
                        {
                            status = "pending";
                        }
                    }
                }

                // Truy vấn phiên bản hiện tại của mã lệnh này để đặt Version tự tăng
                var versionDt = DbHelper.ExecuteQuery("SELECT MAX(Version) as MaxV FROM ProductionOrders WHERE OrderNo = @OrderNo", new MySqlParameter("@OrderNo", orderNo));
                int version = 1;
                if (versionDt.Rows.Count > 0 && versionDt.Rows[0]["MaxV"] != DBNull.Value)
                {
                    version = Convert.ToInt32(versionDt.Rows[0]["MaxV"]) + 1;
                }

                // Thêm Lệnh sản xuất mới và lấy ID vừa tạo trên cùng một kết nối
                int orderId = 0;
                using (var conn = DbHelper.GetConnection())
                {
                    using (var cmd = new MySqlCommand(@"
                        INSERT INTO ProductionOrders (OrderNo, Version, ProductCode, ProductName, TotalQuantity, Unit, Status, ParentOrderId, Stage, CreatedDate)
                        VALUES (@OrderNo, @Version, @ProductCode, @ProductName, @Qty, @Unit, @Status, @ParentOrderId, @Stage, @CreatedDate);
                        SELECT LAST_INSERT_ID();", conn))
                    {
                        cmd.Parameters.AddWithValue("@OrderNo", orderNo);
                        cmd.Parameters.AddWithValue("@Version", version);
                        cmd.Parameters.AddWithValue("@ProductCode", productCode);
                        cmd.Parameters.AddWithValue("@ProductName", productName);
                        cmd.Parameters.AddWithValue("@Qty", totalQuantity);
                        cmd.Parameters.AddWithValue("@Unit", string.IsNullOrEmpty(unit) ? "PCS" : unit);
                        cmd.Parameters.AddWithValue("@Status", status);
                        cmd.Parameters.AddWithValue("@ParentOrderId", parentOrderId.HasValue ? (object)parentOrderId.Value : DBNull.Value);
                        cmd.Parameters.AddWithValue("@Stage", string.IsNullOrEmpty(stage) ? DBNull.Value : (object)stage);
                        cmd.Parameters.AddWithValue("@CreatedDate", createdDateTime);

                        orderId = Convert.ToInt32(cmd.ExecuteScalar());
                    }
                }



                // Phân bổ máy chạy lệnh
                if (!string.IsNullOrEmpty(assignmentsJson))
                {
                    var assignments = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(assignmentsJson);
                    foreach (var assign in assignments)
                    {
                        string mCode = assign["machineCode"].ToString();
                        int targetQty = Convert.ToInt32(assign["targetQuantity"]);

                        var mDt = DbHelper.ExecuteQuery("SELECT Id FROM Machines WHERE MachineCode = @Code", new MySqlParameter("@Code", mCode));
                        if (mDt.Rows.Count > 0)
                        {
                            int mId = Convert.ToInt32(mDt.Rows[0]["Id"]);

                            if (status == "running")
                            {
                                // Tự động chuyển các lệnh đang chạy khác của thiết bị này sang trạng thái 'pending'
                                DbHelper.ExecuteNonQuery(@"
                                    UPDATE ProductionOrders po
                                    JOIN MachineOrders mo ON po.Id = mo.OrderId
                                    SET po.Status = 'pending'
                                    WHERE mo.MachineId = @MachineId AND po.Status = 'running'",
                                    new MySqlParameter("@MachineId", mId));

                            }

                            DbHelper.ExecuteNonQuery(@"
                                INSERT INTO MachineOrders (MachineId, OrderId, TargetQuantity, ActualQuantity)
                                VALUES (@MachineId, @OrderId, @Target, 0)",
                                new MySqlParameter("@MachineId", mId),
                                new MySqlParameter("@OrderId", orderId),
                                new MySqlParameter("@Target", targetQty));
                        }
                    }
                }

                return Content(JsonConvert.SerializeObject(new { success = true, message = "Tạo lệnh sản xuất và phân bổ máy thành công" }), "application/json");
            }
            catch (Exception ex)
            {
                return Content(JsonConvert.SerializeObject(new { success = false, message = ex.Message }), "application/json");
            }
        }

        [HttpPost]
        public ActionResult CancelProductionOrder(int id)
        {
            try
            {
                if (id <= 0)
                {
                    using (var reader = new System.IO.StreamReader(Request.InputStream))
                    {
                        var body = reader.ReadToEnd();
                        var data = JsonConvert.DeserializeObject<dynamic>(body);
                        if (data != null && data.id != null)
                        {
                            id = Convert.ToInt32(data.id);
                        }
                    }
                }

                // Chuyển đổi trạng thái lệnh sang 'cancelled'
                DbHelper.ExecuteNonQuery(@"
                    UPDATE ProductionOrders 
                    SET Status = 'cancelled' 
                    WHERE Id = @Id",
                    new MySqlParameter("@Id", id));



                return Json(new { success = true, message = "Đã hủy lệnh sản xuất thành công" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public ActionResult StartProductionOrder(int id)
        {
            try
            {
                if (id <= 0)
                {
                    using (var reader = new System.IO.StreamReader(Request.InputStream))
                    {
                        var body = reader.ReadToEnd();
                        var data = JsonConvert.DeserializeObject<dynamic>(body);
                        if (data != null && data.id != null)
                        {
                            id = Convert.ToInt32(data.id);
                        }
                    }
                }

                // Lấy MachineId của lệnh này
                var machineDt = DbHelper.ExecuteQuery(@"
                    SELECT MachineId FROM MachineOrders WHERE OrderId = @OrderId LIMIT 1",
                    new MySqlParameter("@OrderId", id));

                if (machineDt.Rows.Count > 0)
                {
                    int mId = Convert.ToInt32(machineDt.Rows[0]["MachineId"]);

                    // Tạm dừng tất cả các lệnh đang chạy khác của thiết bị này
                    DbHelper.ExecuteNonQuery(@"
                        UPDATE ProductionOrders po
                        JOIN MachineOrders mo ON po.Id = mo.OrderId
                        SET po.Status = 'pending'
                        WHERE mo.MachineId = @MachineId AND po.Status = 'running'",
                        new MySqlParameter("@MachineId", mId));

                 }

                // Set lệnh hiện tại thành running
                DbHelper.ExecuteNonQuery(@"
                    UPDATE ProductionOrders SET Status = 'running' WHERE Id = @Id",
                    new MySqlParameter("@Id", id));

                return Json(new { success = true, message = "Đã kích hoạt lệnh chạy thành công" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public ActionResult GetReportData(string range, string machineId, string selectedDate)
        {
            try
            {
                string normalizedRange = range;
                if (range == "24h") normalizedRange = "day";
                if (range == "7d") normalizedRange = "week";

                DateTime startDate = DateTime.Today;
                DateTime endDate = DateTime.Today;

                if (normalizedRange == "day")
                {
                    DateTime.TryParse(selectedDate, out startDate);
                    endDate = startDate;
                }
                else if (normalizedRange == "week")
                {
                    if (!string.IsNullOrEmpty(selectedDate) && selectedDate.Contains("(") && selectedDate.Contains(")"))
                    {
                        var parts = selectedDate.Split('(')[1].Replace(")", "").Split(new string[] { " - " }, StringSplitOptions.None);
                        DateTime.TryParse(parts[0], out startDate);
                        DateTime.TryParse(parts[1], out endDate);
                    }
                    else
                    {
                        int diff = (7 + (DateTime.Today.DayOfWeek - DayOfWeek.Monday)) % 7;
                        startDate = DateTime.Today.AddDays(-1 * diff);
                        endDate = startDate.AddDays(6);
                    }
                }
                else if (normalizedRange == "month")
                {
                    int month = DateTime.Today.Month;
                    int year = DateTime.Today.Year;
                    if (!string.IsNullOrEmpty(selectedDate) && selectedDate.Contains("/"))
                    {
                        var parts = selectedDate.Split('/');
                        int.TryParse(parts[0], out month);
                        int.TryParse(parts[1], out year);
                    }
                    startDate = new DateTime(year, month, 1);
                    endDate = startDate.AddMonths(1).AddDays(-1);
                }
                else if (normalizedRange == "year")
                {
                    int year = DateTime.Today.Year;
                    int.TryParse(selectedDate, out year);
                    startDate = new DateTime(year, 1, 1);
                    endDate = new DateTime(year, 12, 31);
                }

                if (startDate < new DateTime(1900, 1, 1))
                {
                    startDate = DateTime.Today;
                }
                if (endDate < new DateTime(1900, 1, 1))
                {
                    endDate = DateTime.Today;
                }

                int daysCount = (endDate.Date - startDate.Date).Days + 1;
                if (daysCount <= 0) daysCount = 1;

                string machineFilter = "";
                var parameters = new List<MySqlParameter>();

                if (!string.IsNullOrEmpty(machineId))
                {
                    if (machineId == "all_stamping")
                    {
                        machineFilter = " AND m.MachineTypeId = 1";
                    }
                    else if (machineId == "all_screw")
                    {
                        machineFilter = " AND m.MachineTypeId IN (2, 3)";
                    }
                    else if (machineId == "all_heading")
                    {
                        machineFilter = " AND m.MachineTypeId = 2";
                    }
                    else if (machineId == "all_threading")
                    {
                        machineFilter = " AND m.MachineTypeId = 3";
                    }
                    else if (machineId != "all")
                    {
                        machineFilter = " AND m.MachineCode = @MachineCode";
                        parameters.Add(new MySqlParameter("@MachineCode", machineId));
                    }
                }

                var machinesDt = DbHelper.ExecuteQuery(@"
                    SELECT m.Id, m.MachineCode, m.Name, mt.Code as MachineTypeCode
                    FROM Machines m
                    JOIN MachineTypes mt ON m.MachineTypeId = mt.Id
                    WHERE m.IsMonitored = 1" + machineFilter,
                    parameters.ToArray());

                int machinesCount = machinesDt.Rows.Count;
                if (machinesCount == 0) machinesCount = 1;

                var logsParams = new List<MySqlParameter>();
                logsParams.Add(new MySqlParameter("@Start", startDate.Date));
                logsParams.Add(new MySqlParameter("@End", endDate.Date.AddDays(1).AddSeconds(-1)));
                if (!string.IsNullOrEmpty(machineId) && machineId != "all" && machineId != "all_stamping" && machineId != "all_screw" && machineId != "all_heading" && machineId != "all_threading")
                {
                    logsParams.Add(new MySqlParameter("@MachineCode", machineId));
                }

                var dbLogsDt = DbHelper.ExecuteQuery(@"
                    SELECT 
                        SUM(pl.ActualStrokes) as TotalStrokes,
                        SUM(pl.RunningSeconds) as TotalRunningSec,
                        SUM(pl.SetupSeconds) as TotalSetupSec
                    FROM ProductionLogs pl
                    JOIN Machines m ON pl.MachineId = m.Id
                    WHERE pl.Timestamp >= @Start AND pl.Timestamp <= @End" + machineFilter,
                    logsParams.ToArray());

                int actualStrokes = 0;
                int targetStrokes = 1500 * daysCount * machinesCount;
                int runningMins = 0;
                int trialMins = 0;
                int stoppedMins = 0;

                bool hasRealDbData = false;
                if (dbLogsDt.Rows.Count > 0 && dbLogsDt.Rows[0]["TotalStrokes"] != DBNull.Value)
                {
                    actualStrokes = Convert.ToInt32(dbLogsDt.Rows[0]["TotalStrokes"]);
                    runningMins = Convert.ToInt32(dbLogsDt.Rows[0]["TotalRunningSec"]) / 60;
                    trialMins = Convert.ToInt32(dbLogsDt.Rows[0]["TotalSetupSec"]) / 60;
                    stoppedMins = (480 * daysCount * machinesCount) - runningMins - trialMins;
                    if (stoppedMins < 0) stoppedMins = 0;
                    if (actualStrokes > 0) hasRealDbData = true;
                }

                double dateFactor = 1.0;
                if (!hasRealDbData && !string.IsNullOrEmpty(selectedDate))
                {
                    int seed = Math.Abs(selectedDate.GetHashCode());
                    dateFactor = 0.88 + (seed % 25) * 0.01;
                    
                    actualStrokes = (int)(1470 * daysCount * machinesCount * dateFactor);
                    targetStrokes = 1500 * daysCount * machinesCount;
                    trialMins = (int)(30 * daysCount * machinesCount * dateFactor);
                    runningMins = (int)(410 * daysCount * machinesCount * dateFactor);
                    stoppedMins = 480 * daysCount * machinesCount - trialMins - runningMins;
                }

                int oee = targetStrokes > 0 ? (int)((actualStrokes / (double)targetStrokes) * 100) : 0;
                int timeEff = (int)(oee * 0.95);

                // Tính toán kì trước (yesterday/last week/last month)
                var prevLogsParams = new List<MySqlParameter>();
                DateTime prevStartDate = startDate.AddDays(-daysCount);
                DateTime prevEndDate = endDate.AddDays(-daysCount);
                prevLogsParams.Add(new MySqlParameter("@Start", prevStartDate.Date));
                prevLogsParams.Add(new MySqlParameter("@End", prevEndDate.Date.AddDays(1).AddSeconds(-1)));
                if (!string.IsNullOrEmpty(machineId) && machineId != "all" && machineId != "all_stamping" && machineId != "all_screw" && machineId != "all_heading" && machineId != "all_threading")
                {
                    prevLogsParams.Add(new MySqlParameter("@MachineCode", machineId));
                }

                var prevDbLogsDt = DbHelper.ExecuteQuery(@"
                    SELECT 
                        SUM(pl.ActualStrokes) as TotalStrokes
                    FROM ProductionLogs pl
                    JOIN Machines m ON pl.MachineId = m.Id
                    WHERE pl.Timestamp >= @Start AND pl.Timestamp <= @End" + machineFilter,
                    prevLogsParams.ToArray());

                int prevActualStrokes = 0;
                int prevTargetStrokes = 1500 * daysCount * machinesCount;
                bool hasRealPrevDbData = false;
                if (prevDbLogsDt.Rows.Count > 0 && prevDbLogsDt.Rows[0]["TotalStrokes"] != DBNull.Value)
                {
                    prevActualStrokes = Convert.ToInt32(prevDbLogsDt.Rows[0]["TotalStrokes"]);
                    if (prevActualStrokes > 0) hasRealPrevDbData = true;
                }

                if (!hasRealPrevDbData && !string.IsNullOrEmpty(selectedDate))
                {
                    int seed = Math.Abs((selectedDate + "_prev").GetHashCode());
                    double prevDateFactor = 0.88 + (seed % 25) * 0.01;
                    prevActualStrokes = (int)(1470 * daysCount * machinesCount * prevDateFactor);
                }

                int prevOee = prevTargetStrokes > 0 ? (int)((prevActualStrokes / (double)prevTargetStrokes) * 100) : 0;

                int oeeDiff = oee - prevOee;
                double yieldPctChange = prevActualStrokes > 0 ? ((actualStrokes - prevActualStrokes) / (double)prevActualStrokes) * 100 : 0;

                string oeeChangeStr = oeeDiff >= 0 ? "+" + oeeDiff + "%" : oeeDiff + "%";
                string yieldChangeStr = yieldPctChange >= 0 ? "+" + yieldPctChange.ToString("0.0") + "%" : yieldPctChange.ToString("0.0") + "%";
                bool oeeTrendUp = oeeDiff >= 0;
                bool yieldTrendUp = yieldPctChange >= 0;

                var tableRows = new List<object>();
                foreach (DataRow mRow in machinesDt.Rows)
                {
                    string mCode = mRow["MachineCode"].ToString();
                    string mTypeCode = mRow["MachineTypeCode"].ToString().Trim();
                    string mTypeName = mTypeCode == "STAMPING" ? "Máy dập" : 
                                       mTypeCode == "SCREW_HEADING" ? "Máy đấm vít" : "Máy ren vít";

                    int strokesM = (int)(760 * daysCount * (hasRealDbData ? 1.0 : dateFactor));
                    int strokesA = (int)(710 * daysCount * (hasRealDbData ? 1.0 : dateFactor));
                    
                    tableRows.Add(new
                    {
                        shift = "Ca Sáng (08:00 - 12:00)",
                        machine = mTypeName + " " + mCode,
                        strokes = strokesM,
                        uptime = ((240 * daysCount) / 60.0).ToString("0.0") + "h",
                        downtime = (10 * daysCount) + "m",
                        oee = Math.Min(100, (int)((strokesM / (double)(750 * daysCount)) * 100)) + "%",
                        status = "Hoàn thành",
                        statusClass = "badge-success"
                    });

                    tableRows.Add(new
                    {
                        shift = "Ca Chiều (14:00 - 18:00)",
                        machine = mTypeName + " " + mCode,
                        strokes = strokesA,
                        uptime = ((210 * daysCount) / 60.0).ToString("0.0") + "h",
                        downtime = (30 * daysCount) + "m",
                        oee = Math.Min(100, (int)((strokesA / (double)(750 * daysCount)) * 100)) + "%",
                        status = "Hoàn thành",
                        statusClass = "badge-success"
                    });
                }

                var labels = new List<string>();
                var trialData = new List<double>();
                var runningData = new List<double>();
                var stoppedData = new List<double>();
                var actualYieldData = new List<int>();
                var targetYieldData = new List<int>();

                if (normalizedRange == "day")
                {
                    for (int h = 0; h < 24; h++)
                    {
                        labels.Add(h.ToString("00") + ":00");
                        if ((h >= 8 && h < 12) || (h >= 14 && h < 18))
                        {
                            trialData.Add((h == 8 || h == 14 ? 0.15 : 0.0) * dateFactor);
                            runningData.Add((h == 8 || h == 14 ? 0.75 : 0.85) * dateFactor);
                            stoppedData.Add((h == 8 || h == 14 ? 0.1 : 0.15) * dateFactor);
                            actualYieldData.Add((int)(180 * machinesCount * dateFactor));
                            targetYieldData.Add(190 * machinesCount);
                        }
                        else
                        {
                            trialData.Add(0.0);
                            runningData.Add(0.0);
                            stoppedData.Add(0.0);
                            actualYieldData.Add(0);
                            targetYieldData.Add(0);
                        }
                    }
                }
                else if (normalizedRange == "week")
                {
                    labels.AddRange(new string[] { "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN" });
                    trialData.AddRange(new double[] { 0.5, 0.5, 0.5, 0.5, 0.5, 0.3, 0.0 }.Select(v => v * dateFactor));
                    runningData.AddRange(new double[] { 6.8, 6.9, 6.7, 7.1, 6.9, 5.2, 0.0 }.Select(v => v * dateFactor));
                    stoppedData.AddRange(new double[] { 0.7, 0.6, 0.8, 0.4, 0.6, 1.5, 0.0 }.Select(v => v * dateFactor));
                    actualYieldData.AddRange(new int[] { 1520, 1490, 1510, 1530, 1480, 760, 0 }.Select(v => (int)(v * machinesCount * dateFactor)));
                    targetYieldData.AddRange(new int[] { 1500, 1500, 1500, 1500, 1500, 750, 0 }.Select(v => v * machinesCount));
                }
                else
                {
                    labels.AddRange(new string[] { "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12" });
                    for (int m = 1; m <= 12; m++)
                    {
                        trialData.Add(12.0 * dateFactor);
                        runningData.Add(170.0 * dateFactor);
                        stoppedData.Add(18.0 * dateFactor);
                        actualYieldData.Add((int)(38000 * machinesCount * dateFactor));
                        targetYieldData.Add(40000 * machinesCount);
                    }
                }

                return Content(JsonConvert.SerializeObject(new
                {
                    success = true,
                    actualStrokes = actualStrokes,
                    targetStrokes = targetStrokes,
                    actualStrokesStr = string.Format(System.Globalization.CultureInfo.InvariantCulture, "{0:#,##0}", actualStrokes),
                    targetStrokesStr = string.Format(System.Globalization.CultureInfo.InvariantCulture, "{0:#,##0}", targetStrokes),
                    actualPct = oee,
                    targetOrderStr = string.Format(System.Globalization.CultureInfo.InvariantCulture, "{0:#,##0}", 5000 * daysCount * machinesCount),
                    progressOrderStr = string.Format(System.Globalization.CultureInfo.InvariantCulture, "{0:#,##0}", (int)(actualStrokes * 3.3)),
                    progressPct = Math.Min(100, (int)(((actualStrokes * 3.3) / (5000 * daysCount * machinesCount)) * 100)),
                    oee = oee,
                    timeEff = timeEff,
                    trialTimeStr = string.Format("{0:00}:{1:00}:00", trialMins / 60, trialMins % 60),
                    runTimeStr = string.Format("{0:00}:{1:00}:00", runningMins / 60, runningMins % 60),
                    tableRows = tableRows,
                    labels = labels,
                    trialData = trialData,
                    runningData = runningData,
                    stoppedData = stoppedData,
                    actualYieldData = actualYieldData,
                    targetYieldData = targetYieldData,
                    oeeChangeStr = oeeChangeStr,
                    yieldChangeStr = yieldChangeStr,
                    oeeTrendUp = oeeTrendUp,
                    yieldTrendUp = yieldTrendUp
                }), "application/json");
            }
            catch (Exception ex)
            {
                return Content(JsonConvert.SerializeObject(new { success = false, message = ex.Message }), "application/json");
            }
        }

        [HttpGet]
        public ActionResult GetMachineTypes()
        {
            try
            {
                var dt = DbHelper.ExecuteQuery("SELECT Id, Code, Name FROM MachineTypes ORDER BY Id");
                var list = new List<object>();
                foreach (DataRow row in dt.Rows)
                {
                    list.Add(new {
                        id = Convert.ToInt32(row["Id"]),
                        code = row["Code"].ToString(),
                        name = row["Name"].ToString()
                    });
                }
                return Json(new { success = true, data = list }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]
        public ActionResult GetMachineTypeAttributes(int typeId)
        {
            try
            {
                var dt = DbHelper.ExecuteQuery(@"
                    SELECT AttributeKey, DisplayName, Unit, InputType 
                    FROM MachineTypeAttributes 
                    WHERE MachineTypeId = @TypeId 
                    ORDER BY DisplayOrder",
                    new MySqlParameter("@TypeId", typeId));
                
                var list = new List<object>();
                foreach (DataRow row in dt.Rows)
                {
                    list.Add(new {
                        key = row["AttributeKey"].ToString(),
                        displayName = row["DisplayName"].ToString(),
                        unit = row["Unit"] == DBNull.Value ? "" : row["Unit"].ToString(),
                        inputType = row["InputType"].ToString()
                    });
                }
                return Json(new { success = true, data = list }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public ActionResult AddMachine()
        {
            try
            {
                using (var reader = new System.IO.StreamReader(Request.InputStream))
                {
                    var body = reader.ReadToEnd();
                    var data = JsonConvert.DeserializeObject<dynamic>(body);
                    
                    string code = data.code;
                    string name = data.name;
                    int typeId = Convert.ToInt32(data.typeId);
                    bool isMonitored = Convert.ToBoolean(data.isMonitored);
                    
                    var attrs = data.attributes;
                    string attrsJson = JsonConvert.SerializeObject(attrs);
                    
                    var checkDt = DbHelper.ExecuteQuery("SELECT Id FROM Machines WHERE MachineCode = @Code", new MySqlParameter("@Code", code));
                    if (checkDt.Rows.Count > 0)
                    {
                        return Json(new { success = false, message = "Mã thiết bị đã tồn tại trong hệ thống!" });
                    }

                    DbHelper.ExecuteNonQuery(@"
                        INSERT INTO Machines (MachineCode, Name, MachineTypeId, IsMonitored, Status, AttributesJson)
                        VALUES (@Code, @Name, @TypeId, @IsMonitored, 'stopped', @AttrsJson)",
                        new MySqlParameter("@Code", code),
                        new MySqlParameter("@Name", name),
                        new MySqlParameter("@TypeId", typeId),
                        new MySqlParameter("@IsMonitored", isMonitored ? 1 : 0),
                        new MySqlParameter("@AttrsJson", attrsJson)
                    );

                    return Json(new { success = true, message = "Thêm mới thiết bị thành công!" });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }

        private void GenerateMockLogsForToday()
        {
            try
            {
                // Xoá các log trùng khớp ngày hôm nay (nếu có) để tránh lặp
                DbHelper.ExecuteNonQuery("DELETE FROM ProductionLogs WHERE DATE(Timestamp) = CURRENT_DATE()");
                DbHelper.ExecuteNonQuery("DELETE FROM Alarms WHERE DATE(Timestamp) = CURRENT_DATE()");

                // Lấy toàn bộ danh sách máy hiện có
                var machinesDt = DbHelper.ExecuteQuery("SELECT Id, MachineTypeId, MachineCode FROM Machines");
                DateTime today = DateTime.Today;

                foreach (DataRow row in machinesDt.Rows)
                {
                    int mId = Convert.ToInt32(row["Id"]);
                    int typeId = Convert.ToInt32(row["MachineTypeId"]);
                    string mCode = row["MachineCode"].ToString();

                    // Chọn trạng thái: giả lập có cả máy chạy máy dừng
                    string status = "running";
                    if (mId == 6 || mId == 10 || mId == 14 || mId == 20 || mId == 27)
                    {
                        status = "stopped";
                    }

                    int orderId = mId == 28 ? 29 : mId;
                    int targetQty = 1500 + mId * 250;
                    int strokes = 0;

                    if (mId == 1) // DD02 (Completed)
                    {
                        orderId = 1;
                        targetQty = 10000;
                        strokes = 10000;
                    }
                    else if (mId == 2) // DD26 (Running)
                    {
                        orderId = 2; // ID = mId
                        targetQty = 1500;
                        strokes = 750;
                    }
                    else if (mId == 12) // ĐB01 (Running, has pending order 30 too)
                    {
                        orderId = 12;
                        targetQty = 2000;
                        strokes = 1480;

                        // Insert pending machine order 30 too
                        DbHelper.ExecuteNonQuery(@"
                            INSERT INTO MachineOrders (MachineId, OrderId, TargetQuantity, ActualQuantity, AssignedAt)
                            VALUES (@MachineId, 30, 4000, 0, @AssignedAt)
                            ON DUPLICATE KEY UPDATE TargetQuantity = VALUES(TargetQuantity)",
                            new MySqlParameter("@MachineId", mId),
                            new MySqlParameter("@AssignedAt", today.AddHours(7)));
                    }
                    else if (mId == 27) // RV24 (Cancelled)
                    {
                        orderId = 27;
                        targetQty = 5000;
                        strokes = 1200;
                    }
                    else if (mId == 28) // RV14 (Running)
                    {
                        orderId = 29; // Kế thừa từ 27, có ID = 29
                        targetQty = 3800;
                        strokes = 800;
                    }
                    else
                    {
                        if (status == "running")
                        {
                            strokes = 700 + (mId * 65) % 800;
                        }
                    }

                    int runSeconds = 0;
                    int setupSeconds = 0;

                    if (status == "running" || mId == 1)
                    {
                        if (mId == 1)
                        {
                            runSeconds = 22000;
                            setupSeconds = 1200;
                        }
                        else
                        {
                            runSeconds = 15000 + (mId * 900) % 13000;
                            setupSeconds = 400 + (mId * 100) % 1100;
                        }
                    }

                    // Đảm bảo máy có phân công Lệnh sản xuất tương ứng trong bảng MachineOrders
                    DbHelper.ExecuteNonQuery(@"
                        INSERT INTO MachineOrders (MachineId, OrderId, TargetQuantity, ActualQuantity, AssignedAt)
                        VALUES (@MachineId, @OrderId, @TargetQty, @ActualQty, @AssignedAt)
                        ON DUPLICATE KEY UPDATE TargetQuantity = @TargetQty, ActualQuantity = @ActualQty",
                        new MySqlParameter("@MachineId", mId),
                        new MySqlParameter("@OrderId", orderId),
                        new MySqlParameter("@TargetQty", targetQty),
                        new MySqlParameter("@ActualQty", strokes),
                        new MySqlParameter("@AssignedAt", today.AddHours(7).AddMinutes(30))
                    );

                    // 1. Cập nhật trạng thái máy trong bảng Machines
                    DbHelper.ExecuteNonQuery(
                        "UPDATE Machines SET Status = @Status WHERE Id = @Id",
                        new MySqlParameter("@Status", status),
                        new MySqlParameter("@Id", mId)
                    );

                    // 2. Chèn dữ liệu log tương ứng cho ngày hôm nay
                    if (status == "running" || mId == 1)
                    {
                        int s1 = strokes / 3;
                        int s2 = strokes / 3;
                        int s3 = strokes - s1 - s2;

                        int r1 = runSeconds / 3;
                        int r2 = runSeconds / 3;
                        int r3 = runSeconds - r1 - r2;

                        int se1 = setupSeconds / 3;
                        int se2 = setupSeconds / 3;
                        int se3 = setupSeconds - se1 - se2;

                        DbHelper.ExecuteNonQuery(@"
                            INSERT INTO ProductionLogs (MachineId, OrderId, Timestamp, ActualStrokes, RunningSeconds, SetupSeconds, Status) VALUES
                            (@Id, @OrderId, @Time1, @Strokes1, @Run1, @Setup1, 'running'),
                            (@Id, @OrderId, @Time2, @Strokes2, @Run2, @Setup2, 'running'),
                            (@Id, @OrderId, @Time3, @Strokes3, @Run3, @Setup3, 'running')",
                            new MySqlParameter("@Id", mId),
                            new MySqlParameter("@OrderId", orderId),
                            new MySqlParameter("@Time1", today.AddHours(8).AddMinutes(30)),
                            new MySqlParameter("@Strokes1", s1),
                            new MySqlParameter("@Run1", r1),
                            new MySqlParameter("@Setup1", se1),
                            new MySqlParameter("@Time2", today.AddHours(10).AddMinutes(15)),
                            new MySqlParameter("@Strokes2", s2),
                            new MySqlParameter("@Run2", r2),
                            new MySqlParameter("@Setup2", se2),
                            new MySqlParameter("@Time3", today.AddHours(14).AddMinutes(45)),
                            new MySqlParameter("@Strokes3", s3),
                            new MySqlParameter("@Run3", r3),
                            new MySqlParameter("@Setup3", se3)
                        );
                    }
                    else
                    {
                        DbHelper.ExecuteNonQuery(@"
                            INSERT INTO ProductionLogs (MachineId, OrderId, Timestamp, ActualStrokes, RunningSeconds, SetupSeconds, Status) VALUES
                            (@Id, @OrderId, @Time1, 0, 0, 0, 'stopped')",
                            new MySqlParameter("@Id", mId),
                            new MySqlParameter("@OrderId", orderId),
                            new MySqlParameter("@Time1", today.AddHours(8))
                        );

                        string deviceName = typeId == 1 ? "máy dập" : (typeId == 2 ? "máy đấm vít" : "máy cán ren");
                        DbHelper.ExecuteNonQuery(@"
                            INSERT INTO Alarms (MachineId, OrderId, Code, Severity, Description, Timestamp, Status) VALUES
                            (@Id, @OrderId, 'MACHINE-STOPPED-ALERT', 'critical', @Desc, @AlarmTime, 'emergency')",
                            new MySqlParameter("@Id", mId),
                            new MySqlParameter("@OrderId", orderId),
                            new MySqlParameter("@Desc", $"Thiết bị {deviceName} {mCode} đang dừng hoạt động bất thường. Yêu cầu kiểm tra nguồn điện."),
                            new MySqlParameter("@AlarmTime", today.AddHours(8).AddMinutes(15))
                        );
                    }
                }
            }
            catch (Exception ex)
            {
                 System.Diagnostics.Debug.WriteLine("Error seeding mock logs: " + ex.Message);
            }
        }

        private void MigrateProductionOrdersSchema()
        {
            try
            {
                // Kiểm tra xem cột Version đã tồn tại trong bảng ProductionOrders chưa
                var checkCol = DbHelper.ExecuteQuery(@"
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                      AND TABLE_NAME = 'ProductionOrders' 
                      AND COLUMN_NAME = 'Version'");
                
                if (checkCol.Rows.Count == 0)
                {
                    // Loại bỏ chỉ mục UNIQUE của OrderNo (tên chỉ mục thường là OrderNo)
                    try
                    {
                        DbHelper.ExecuteNonQuery("ALTER TABLE ProductionOrders DROP INDEX OrderNo");
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine("Unique index not found or already dropped: " + ex.Message);
                    }
                    
                    // Thêm cột Version, Stage, ParentOrderId và khóa ngoại
                    DbHelper.ExecuteNonQuery("ALTER TABLE ProductionOrders ADD COLUMN Version INT NOT NULL DEFAULT 1 AFTER OrderNo");
                    DbHelper.ExecuteNonQuery("ALTER TABLE ProductionOrders ADD COLUMN Stage VARCHAR(100) NULL AFTER Status");
                    DbHelper.ExecuteNonQuery("ALTER TABLE ProductionOrders ADD COLUMN ParentOrderId INT NULL AFTER Status");
                    DbHelper.ExecuteNonQuery("ALTER TABLE ProductionOrders ADD CONSTRAINT FK_ProductionOrders_Parent FOREIGN KEY (ParentOrderId) REFERENCES ProductionOrders(Id)");
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("Error migrating ProductionOrders schema: " + ex.Message);
            }
        }

        private void MigrateDatabaseMachines()
        {
            try
            {
                // Kiểm tra xem đã chạy di chuyển cấu trúc danh sách máy mới chưa (cần có đúng 28 máy)
                var checkCount = DbHelper.ExecuteQuery("SELECT COUNT(*) as Total FROM Machines");
                int totalMachines = checkCount.Rows.Count > 0 ? Convert.ToInt32(checkCount.Rows[0]["Total"]) : 0;
                if (totalMachines == 28)
                {
                    return;
                }

                // Tiến hành reset dữ liệu các bảng máy dập, máy đấm, máy cán ren
                DbHelper.ExecuteNonQuery("SET FOREIGN_KEY_CHECKS = 0;");
                DbHelper.ExecuteNonQuery("TRUNCATE TABLE MachineShifts;");
                DbHelper.ExecuteNonQuery("TRUNCATE TABLE MachineOrders;");
                DbHelper.ExecuteNonQuery("TRUNCATE TABLE ProductionLogs;");
                DbHelper.ExecuteNonQuery("TRUNCATE TABLE Alarms;");
                DbHelper.ExecuteNonQuery("TRUNCATE TABLE Machines;");
                DbHelper.ExecuteNonQuery("TRUNCATE TABLE ProductionOrders;");

                int id = 1;
                DateTime today = DateTime.Today;

                // 1. Thêm 11 máy dập (Type 1)
                var pressMachines = new[] { "DD02", "DD26", "DD25", "DD01", "DD05", "DD23", "DD17", "DD21", "DD22", "DD24", "MC01" };
                foreach (var code in pressMachines)
                {
                    string attrs = "{\"model\": \"NC1-110\", \"hang_san_xuat\": \"AIDA\", \"luc_dap\": \"110 Tons\", \"hanh_trinh_dau_truot\": \"180 mm\", \"die_height\": \"350 mm\", \"toc_do_dap\": \"55 spm\", \"kich_thuoc_ban_may\": \"1150x680 mm\", \"vi_tri_lap_dat\": \"Xưởng Dập A\", \"nguoi_phu_trach\": \"Nguyễn Văn Hùng\", \"ngay_su_dung\": \"10/11/2024\"}";
                    DbHelper.ExecuteNonQuery(@"
                        INSERT INTO Machines (Id, MachineCode, Name, MachineTypeId, IsMonitored, Status, AttributesJson)
                        VALUES (@Id, @Code, @Name, 1, 1, 'running', @Attrs)",
                        new MySqlParameter("@Id", id),
                        new MySqlParameter("@Code", code),
                        new MySqlParameter("@Name", code),
                        new MySqlParameter("@Attrs", attrs));

                    DbHelper.ExecuteNonQuery(@"
                        INSERT INTO MachineShifts (MachineId, ShiftType, StartTime, EndTime, EffectiveDate)
                        VALUES (@MachineId, '8h', '08:00:00', '16:00:00', '2026-07-01')",
                        new MySqlParameter("@MachineId", id));

                    SeedUniqueOrderForMachine(id, code, 1, (id == 6 || id == 10) ? "stopped" : (id == 1 ? "completed" : "running"), today);
                    id++;
                }

                // 2. Thêm 15 máy đấm đầu vít (Type 2)
                var headingMachines = new[] { "ĐB01", "DV09", "DV10", "DV11", "DV12", "DV13", "DV14", "DV15", "DV16", "DV17", "DV18", "DV19", "DV20", "DV24", "DV25" };
                foreach (var code in headingMachines)
                {
                    string attrs = "{\"model\": \"DV-Model-B\", \"hang_san_xuat\": \"HP-Machinery\", \"vi_tri_lap_dat\": \"Xưởng Đấm vít\", \"duong_kinh_day\": \"Ø2.0 ~ Ø6.0 mm\", \"chieu_dai_phoi\": \"8 ~ 80 mm\", \"so_bua_dam\": \"1K2B\", \"toc_do_may\": \"180 pcs/phút\", \"cong_suat_motor\": \"7.5 kW\", \"ngay_su_dung\": \"12/05/2025\"}";
                    DbHelper.ExecuteNonQuery(@"
                        INSERT INTO Machines (Id, MachineCode, Name, MachineTypeId, IsMonitored, Status, AttributesJson)
                        VALUES (@Id, @Code, @Name, 2, 1, 'running', @Attrs)",
                        new MySqlParameter("@Id", id),
                        new MySqlParameter("@Code", code),
                        new MySqlParameter("@Name", code),
                        new MySqlParameter("@Attrs", attrs));

                    DbHelper.ExecuteNonQuery(@"
                        INSERT INTO MachineShifts (MachineId, ShiftType, StartTime, EndTime, EffectiveDate)
                        VALUES (@MachineId, '8h', '08:00:00', '16:00:00', '2026-07-01')",
                        new MySqlParameter("@MachineId", id));

                    SeedUniqueOrderForMachine(id, code, 2, (id == 14 || id == 20) ? "stopped" : "running", today);
                    id++;
                }

                // 3. Thêm 2 máy ren vít (Type 3)
                var threadingMachines = new[] { "RV24", "RV14" };
                foreach (var code in threadingMachines)
                {
                    string attrs = "{\"model\": \"RV-Model-A\", \"hang_san_xuat\": \"HP-Machinery\", \"vi_tri_lap_dat\": \"Xưởng Vít\", \"duong_kinh_phoi\": \"Ø2 ~ Ø8 mm\", \"chieu_dai_phoi\": \"10 ~ 80 mm\", \"kha_nang_gia_cong_ren\": \"M2 ~ M8\", \"chieu_dai_ren_max\": \"60 mm\", \"toc_do_may\": \"180 pcs/phút\", \"cong_suat_motor\": \"7.5 kW\", \"ngay_su_dung\": \"12/05/2025\"}";
                    DbHelper.ExecuteNonQuery(@"
                        INSERT INTO Machines (Id, MachineCode, Name, MachineTypeId, IsMonitored, Status, AttributesJson)
                        VALUES (@Id, @Code, @Name, 3, 1, 'running', @Attrs)",
                        new MySqlParameter("@Id", id),
                        new MySqlParameter("@Code", code),
                        new MySqlParameter("@Name", code),
                        new MySqlParameter("@Attrs", attrs));

                    DbHelper.ExecuteNonQuery(@"
                        INSERT INTO MachineShifts (MachineId, ShiftType, StartTime, EndTime, EffectiveDate)
                        VALUES (@MachineId, '8h', '08:00:00', '16:00:00', '2026-07-01')",
                        new MySqlParameter("@MachineId", id));

                    SeedUniqueOrderForMachine(id, code, 3, id == 27 ? "cancelled" : "running", today);
                    id++;
                }

                DbHelper.ExecuteNonQuery("SET FOREIGN_KEY_CHECKS = 1;");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("Error migrating machines: " + ex.Message);
            }
        }

        private void SeedUniqueOrderForMachine(int mId, string mCode, int typeId, string orderStatus, DateTime today)
        {
            string orderNo = $"LSX-202607{mId:00}-01";
            string productCode = typeId == 1 ? $"SP-DAP-{mId:00}" : typeId == 2 ? $"V-SELF-{mId:00}" : $"R-VIT-{mId:00}";
            string productName = typeId == 1 ? $"Thân vỏ định hình dập #{mCode}" : typeId == 2 ? $"Vít tự khoan Bake #{mCode}" : $"Ren vít M4 #{mCode}";
            int totalQty = 1500 + mId * 250;
            int targetQty = totalQty;
            int actualQty = 0;

            if (mId == 1) // DD02
            {
                targetQty = 10000;
                totalQty = 10000;
                actualQty = 10000;
            }
            else if (mId == 2) // DD26
            {
                targetQty = 1500;
                totalQty = 1500;
                actualQty = 750;
            }
            else if (mId == 12) // ĐB01
            {
                targetQty = 2000;
                totalQty = 2000;
                actualQty = 1480;

                // Chèn thêm lệnh pending thứ hai cho máy này
                DbHelper.ExecuteNonQuery(@"
                    INSERT INTO ProductionOrders (Id, OrderNo, Version, ProductCode, ProductName, TotalQuantity, Unit, Status, ParentOrderId, Stage, CreatedDate)
                    VALUES (30, 'LSX-20260712-02', 1, 'V-SELF-12-P', 'Vít tự khoan Bake 6x30mm', 4000, 'PCS', 'pending', NULL, 'Đấm đầu vít', CURRENT_TIMESTAMP())");

                DbHelper.ExecuteNonQuery(@"
                    INSERT INTO MachineOrders (MachineId, OrderId, TargetQuantity, ActualQuantity, AssignedAt)
                    VALUES (@MachineId, 30, 4000, 0, @AssignedAt)",
                    new MySqlParameter("@MachineId", mId),
                    new MySqlParameter("@AssignedAt", today.AddHours(7)));
            }
            else if (mId == 27) // RV24
            {
                totalQty = 5000;
                targetQty = 5000;
                actualQty = 1200;
            }
            else if (mId == 28) // RV14 (inherited from 27)
            {
                orderNo = "LSX-20260727-01"; // Cùng mã lệnh với máy RV24
                productCode = "R-VIT-27";
                productName = "Ren vít M4 #RV24";
                totalQty = 3800;
                targetQty = 3800;
                actualQty = 800;
            }
            else
            {
                actualQty = orderStatus == "running" ? 700 + (mId * 65) % 800 : 0;
            }

            int orderTableId = mId;
            int version = 1;
            int? parentId = null;

            if (mId == 28)
            {
                orderTableId = 29;
                version = 2;
                parentId = 27; // Lệnh cha là lệnh của máy 27
            }

            string stage = typeId == 1 ? "Dập định hình" : typeId == 2 ? "Đấm đầu vít" : "Cán ren vít";

            // Chèn ProductionOrders
            DbHelper.ExecuteNonQuery(@"
                INSERT INTO ProductionOrders (Id, OrderNo, Version, ProductCode, ProductName, TotalQuantity, Unit, Status, ParentOrderId, Stage, CreatedDate)
                VALUES (@Id, @OrderNo, @Version, @ProductCode, @ProductName, @TotalQty, 'PCS', @Status, @Parent, @Stage, CURRENT_TIMESTAMP())",
                new MySqlParameter("@Id", orderTableId),
                new MySqlParameter("@OrderNo", orderNo),
                new MySqlParameter("@Version", version),
                new MySqlParameter("@ProductCode", productCode),
                new MySqlParameter("@ProductName", productName),
                new MySqlParameter("@TotalQty", totalQty),
                new MySqlParameter("@Status", orderStatus),
                new MySqlParameter("@Parent", parentId.HasValue ? (object)parentId.Value : DBNull.Value),
                new MySqlParameter("@Stage", stage));

            // Chèn MachineOrders
            DbHelper.ExecuteNonQuery(@"
                INSERT INTO MachineOrders (MachineId, OrderId, TargetQuantity, ActualQuantity, AssignedAt)
                VALUES (@MachineId, @OrderId, @TargetQty, @ActualQty, @AssignedAt)",
                new MySqlParameter("@MachineId", mId),
                new MySqlParameter("@OrderId", orderTableId),
                new MySqlParameter("@TargetQty", targetQty),
                new MySqlParameter("@ActualQty", actualQty),
                new MySqlParameter("@AssignedAt", today.AddHours(7).AddMinutes(30)));
        }


    }
}
