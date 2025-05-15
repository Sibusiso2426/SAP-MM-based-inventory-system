import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line } from "recharts";
import Papa from "papaparse";
import _ from "lodash";

export default function InventoryDashboard() {
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPO, setSelectedPO] = useState(null);
  const [qualityRanges, setQualityRanges] = useState([]);
  const [topVendors, setTopVendors] = useState([]);
  const [receiptTrend, setReceiptTrend] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await window.fs.readFile("SAP_MM_Inventory_Management_Sample_Dataset.csv", { encoding: "utf8" });
        
        Papa.parse(result, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            const data = results.data;
            setInventoryData(data);
            processData(data);
            setLoading(false);
          },
          error: (error) => {
            console.error("Error parsing CSV:", error);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const processData = (data) => {
    // Process quality score ranges
    const qualityGroups = _.groupBy(data, item => {
      if (item.Quality_Score <= 1.5) return "Poor (0-1.5)";
      if (item.Quality_Score <= 3.0) return "Average (1.6-3.0)";
      if (item.Quality_Score <= 4.0) return "Good (3.1-4.0)";
      return "Excellent (4.1-5.0)";
    });

    const qualityData = Object.entries(qualityGroups).map(([range, items]) => ({
      name: range,
      value: items.length,
      items: items
    }));

    setQualityRanges(qualityData);

    // Process top vendors by received quantity
    const vendorGroups = _.groupBy(data, 'PO_ID');
    const vendorData = Object.entries(vendorGroups).map(([poId, items]) => ({
      poId,
      totalQuantity: _.sumBy(items, 'Received_Quantity'),
      avgQuality: _.meanBy(items, 'Quality_Score').toFixed(2),
      receivedCount: items.length
    }));

    const sortedVendors = _.orderBy(vendorData, ['totalQuantity'], ['desc']).slice(0, 10);
    setTopVendors(sortedVendors);

    // Process receipt trend by date
    const groupedByDate = _.groupBy(data, 'Received_Date');
    const trendData = Object.entries(groupedByDate).map(([date, items]) => ({
      date,
      totalQuantity: _.sumBy(items, 'Received_Quantity'),
      count: items.length
    }));

    const sortedTrend = _.orderBy(trendData, ['date'], ['asc']);
    setReceiptTrend(sortedTrend);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">Loading inventory data...</div>
      </div>
    );
  }

  const renderSelectedPODetails = () => {
    if (!selectedPO) return null;
    
    const poReceipts = inventoryData.filter(item => item.PO_ID === selectedPO);
    
    return (
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-2">Purchase Order: {selectedPO}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">GR ID</th>
                <th className="px-4 py-2 text-left">Received Date</th>
                <th className="px-4 py-2 text-right">Quantity</th>
                <th className="px-4 py-2 text-right">Quality Score</th>
              </tr>
            </thead>
            <tbody>
              {poReceipts.map((receipt) => (
                <tr key={receipt.GR_ID} className="border-t">
                  <td className="px-4 py-2">{receipt.GR_ID}</td>
                  <td className="px-4 py-2">{receipt.Received_Date}</td>
                  <td className="px-4 py-2 text-right">{receipt.Received_Quantity}</td>
                  <td className="px-4 py-2 text-right">{receipt.Quality_Score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <header className="bg-blue-700 text-white p-4 rounded-lg shadow mb-6">
        <h1 className="text-2xl font-bold">SAP MM Inventory Management Dashboard</h1>
        <p className="opacity-80">Metrics based on {inventoryData.length} goods receipt records</p>
      </header>

      <div className="mb-6">
        <div className="bg-white p-2 rounded-lg shadow flex border-b">
          <button
            className={`px-4 py-2 font-medium ${activeTab === "overview" ? "bg-blue-500 text-white rounded" : "text-gray-600"}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === "vendors" ? "bg-blue-500 text-white rounded" : "text-gray-600"}`}
            onClick={() => setActiveTab("vendors")}
          >
            Vendor Analysis
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === "quality" ? "bg-blue-500 text-white rounded" : "text-gray-600"}`}
            onClick={() => setActiveTab("quality")}
          >
            Quality Metrics
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === "trends" ? "bg-blue-500 text-white rounded" : "text-gray-600"}`}
            onClick={() => setActiveTab("trends")}
          >
            Receipt Trends
          </button>
        </div>
      </div>

      {selectedPO && renderSelectedPODetails()}

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Quality Score Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={qualityRanges}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {qualityRanges.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Top 5 POs by Quantity</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={topVendors.slice(0, 5)}
                margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="poId" 
                  angle={-45} 
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="totalQuantity" 
                  name="Total Quantity" 
                  fill="#8884d8" 
                  onClick={(data) => setSelectedPO(data.poId)}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="text-center text-sm text-gray-500 mt-2">Click on a bar to see PO details</div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Receipt Trend (Last 4 Weeks)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={receiptTrend}
                margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  angle={-45} 
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 10 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="totalQuantity" name="Total Quantity" stroke="#8884d8" />
                <Line type="monotone" dataKey="count" name="Receipt Count" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "vendors" && (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Top 10 Purchase Orders by Quantity</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">PO ID</th>
                    <th className="px-4 py-2 text-right">Total Quantity</th>
                    <th className="px-4 py-2 text-right">Avg. Quality Score</th>
                    <th className="px-4 py-2 text-right">Receipt Count</th>
                    <th className="px-4 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {topVendors.map((vendor) => (
                    <tr 
                      key={vendor.poId} 
                      className="border-t hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedPO(vendor.poId)}
                    >
                      <td className="px-4 py-2">{vendor.poId}</td>
                      <td className="px-4 py-2 text-right">{vendor.totalQuantity}</td>
                      <td className="px-4 py-2 text-right">{vendor.avgQuality}</td>
                      <td className="px-4 py-2 text-right">{vendor.receivedCount}</td>
                      <td className="px-4 py-2 text-center">
                        <button className="bg-blue-500 text-white px-2 py-1 rounded text-sm">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">PO Quality Assessment</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={topVendors}
                margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="poId" 
                  angle={-45} 
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 12 }}
                />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="avgQuality" 
                  name="Average Quality Score" 
                  fill="#82ca9d" 
                  onClick={(data) => setSelectedPO(data.poId)}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "quality" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Quality Score Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={qualityRanges}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {qualityRanges.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Quality Issues by Purchase Order</h2>
            <div className="overflow-y-auto max-h-96">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">PO ID</th>
                    <th className="px-4 py-2 text-left">GR ID</th>
                    <th className="px-4 py-2 text-right">Quality Score</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryData
                    .filter(item => item.Quality_Score < 2.0)
                    .sort((a, b) => a.Quality_Score - b.Quality_Score)
                    .map((item) => (
                      <tr key={item.GR_ID} className="border-t">
                        <td className="px-4 py-2">{item.PO_ID}</td>
                        <td className="px-4 py-2">{item.GR_ID}</td>
                        <td className="px-4 py-2 text-right">{item.Quality_Score}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-1 rounded text-white bg-red-500 text-xs">
                            Quality Issue
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "trends" && (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Daily Receipt Trend</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={receiptTrend}
                margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  angle={-45} 
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 10 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="totalQuantity" name="Total Quantity" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Receipt Count by Date</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={receiptTrend}
                margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  angle={-45} 
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 10 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Receipt Count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}