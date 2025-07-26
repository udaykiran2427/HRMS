import React from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Home,
  Briefcase,
  PlusCircle,
  LogOut,
  Shield,
  User,
  Users,
  Settings,
  FileText,
  RefreshCw,
  Trash2,
  Edit,
} from "lucide-react";

// --- API Configuration ---
const API_URL = "http://127.0.0.1:5000/api";

// --- HELPER FUNCTIONS ---
const formatDate = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  const offsetD = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  return offsetD.toLocaleDateString("en-CA");
};
const getDayDifference = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// --- GENERIC COMPONENTS ---
const LeaveBalanceCard = ({ balances }) => (
  <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
    <h3 className="text-xl font-bold text-gray-800 mb-4">Leave Balances</h3>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
      {Object.entries(balances || {}).map(([type, value]) => (
        <div key={type} className="bg-gray-50 p-3 rounded-lg">
          <p className="text-2xl font-bold text-indigo-600">{value}</p>
          <p className="text-sm text-gray-500 capitalize">
            {type === "lop" ? "LOP" : type === "compOff" ? "Comp Off" : type}
          </p>
        </div>
      ))}
    </div>
  </div>
);
const Notification = ({ info }) => {
  if (!info) return null;
  const isSuccess = info.type === "success";
  const bgColor = isSuccess ? "bg-green-100" : "bg-red-100",
    textColor = isSuccess ? "text-green-800" : "text-red-800";
  const Icon = isSuccess ? CheckCircle : XCircle;
  return (
    <div
      className={`p-4 rounded-md ${bgColor} ${textColor} my-4 flex items-center shadow`}
    >
      <Icon className="mr-3" /> {info.message}
    </div>
  );
};

// --- USER/MANAGER COMPONENTS ---
const ApplyLeaveForm = ({ userId, config, setNotification, refreshData }) => {
  const [leaveType, setLeaveType] = React.useState("casual");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setNotification(null);
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      setNotification({
        type: "error",
        message: "End date cannot be before start date.",
      });
      setIsSubmitting(false);
      return;
    }
    const advanceNoticeDays = config.settings.advanceNoticeDays;
    const noticeDate = new Date();
    noticeDate.setDate(new Date().getDate() + advanceNoticeDays);
    if (["casual", "vacation"].includes(leaveType) && start < noticeDate) {
      setNotification({
        type: "error",
        message: `Casual and Vacation leave must be applied for at least ${advanceNoticeDays} working days in advance.`,
      });
      setIsSubmitting(false);
      return;
    }
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const dateString = d.toISOString().split("T")[0];
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        setNotification({
          type: "error",
          message: `Leave period includes a weekend (${dateString}). Please apply separately.`,
        });
        setIsSubmitting(false);
        return;
      }
      if (config.holidays.includes(dateString)) {
        setNotification({
          type: "error",
          message: `Leave period includes a public holiday (${dateString}).`,
        });
        setIsSubmitting(false);
        return;
      }
    }
    try {
      const response = await fetch(`${API_URL}/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, leaveType, startDate, endDate, reason }),
      });
      if (!response.ok) throw new Error("API request failed");
      setNotification({
        type: "success",
        message: "Leave applied successfully!",
      });
      setLeaveType("casual");
      setStartDate("");
      setEndDate("");
      setReason("");
      refreshData();
    } catch (error) {
      console.error("Error applying for leave: ", error);
      setNotification({
        type: "error",
        message: "Failed to apply for leave. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mt-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <PlusCircle className="mr-2 text-indigo-500" /> Apply for Leave / WFH
      </h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Leave Type
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="vacation">Vacation</option>
              <option value="wfh">Work From Home (WFH)</option>
              <option value="comp-off">Compensatory Off</option>
              <option value="academic">Academic Leave</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="mt-6 text-right">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
          >
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
};
const LeaveHistory = ({ leaves, setNotification, refreshData }) => {
  const cancelLeave = async (leaveId) => {
    if (!window.confirm("Are you sure you want to cancel this leave request?"))
      return;
    try {
      const response = await fetch(`${API_URL}/leaves/${leaveId}/cancel`, {
        method: "PUT",
      });
      if (!response.ok) throw new Error("API request failed");
      setNotification({ type: "success", message: "Leave request cancelled." });
      refreshData();
    } catch (error) {
      console.error("Error cancelling leave:", error);
      setNotification({ type: "error", message: "Failed to cancel leave." });
    }
  };
  const getStatusChip = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}
      >
        {status}
      </span>
    );
  };
  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mt-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <Calendar className="mr-2 text-indigo-500" /> My Leave History
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Days
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Applied On
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leaves.length > 0 ? (
              leaves.map((leave) => (
                <tr key={leave.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                    {leave.leaveType.replace("-", " ")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getDayDifference(leave.startDate, leave.endDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getStatusChip(leave.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(leave.appliedOn)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {leave.status === "pending" &&
                      new Date(leave.startDate) > new Date() && (
                        <button
                          onClick={() => cancelLeave(leave.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Cancel
                        </button>
                      )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-4 text-gray-500">
                  No leave history found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
const ManagerView = ({ managerId, setNotification, refreshData }) => {
  const [pendingRequests, setPendingRequests] = React.useState([]);
  React.useEffect(() => {
    if (!managerId) return;
    const fetchPendingRequests = async () => {
      try {
        const response = await fetch(`${API_URL}/leaves/manager/${managerId}`);
        const data = await response.json();
        setPendingRequests(data);
      } catch (error) {
        console.error("Error fetching pending requests:", error);
      }
    };
    fetchPendingRequests();
  }, [managerId, refreshData]);
  const handleRequest = async (leaveId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/leaves/${leaveId}/decide`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("API request failed");
      setNotification({
        type: "success",
        message: `Request has been ${newStatus}.`,
      });
      refreshData();
    } catch (error) {
      console.error("Error handling request:", error);
      setNotification({ type: "error", message: "Failed to process request." });
    }
  };
  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mt-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <Briefcase className="mr-2 text-indigo-500" /> Team Leave Requests
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pendingRequests.length > 0 ? (
              pendingRequests.map((req) => (
                <tr key={req.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {req.userName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {req.leaveType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(req.startDate)} to {formatDate(req.endDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {req.reason}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleRequest(req.id, "approved")}
                      className="text-green-600 hover:text-green-900"
                    >
                      <CheckCircle size={20} />
                    </button>
                    <button
                      onClick={() => handleRequest(req.id, "rejected")}
                      className="text-red-600 hover:text-red-900"
                    >
                      <XCircle size={20} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-4 text-gray-500">
                  No pending requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- ADMIN COMPONENTS ---
const EditUserModal = ({
  user,
  allUsers,
  onSave,
  onCancel,
  setNotification,
}) => {
  const [editData, setEditData] = React.useState({
    role: user.role,
    managerId: user.managerId || "",
    leaveBalances: { ...user.leaveBalances },
  });

  const handleSave = async () => {
    try {
      const payload = {
        role: editData.role,
        managerId: editData.managerId || null,
        leaveBalances: editData.leaveBalances,
      };
      const res = await fetch(`${API_URL}/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update user");
      setNotification({
        type: "success",
        message: `User ${user.name} updated.`,
      });
      onSave();
    } catch (err) {
      setNotification({ type: "error", message: err.message });
    }
  };

  const handleBalanceChange = (leaveType, value) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;
    setEditData((prev) => ({
      ...prev,
      leaveBalances: { ...prev.leaveBalances, [leaveType]: numValue },
    }));
  };

  const potentialManagers = allUsers.filter(
    (u) => u.role === "manager" && u.id !== user.id
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h3 className="text-lg font-bold mb-4">Edit User: {user.name}</h3>
        {/* User Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              value={editData.role}
              onChange={(e) =>
                setEditData({ ...editData, role: e.target.value })
              }
              className="mt-1 w-full p-2 border rounded-md"
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Reporting Manager
            </label>
            <select
              value={editData.managerId}
              onChange={(e) =>
                setEditData({ ...editData, managerId: e.target.value })
              }
              className="mt-1 w-full p-2 border rounded-md"
            >
              <option value="">-- No Manager --</option>
              {potentialManagers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Leave Balances Section */}
        <div>
          <h4 className="text-md font-semibold mb-2">Adjust Leave Balances</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(editData.leaveBalances).map(([type, value]) => (
              <div key={type}>
                <label className="block text-sm font-medium text-gray-700 capitalize">
                  {type === "lop"
                    ? "LOP"
                    : type === "compOff"
                    ? "Comp Off"
                    : type}
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleBalanceChange(type, e.target.value)}
                  className="mt-1 w-full p-2 border rounded-md"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const UserManagement = ({ setNotification }) => {
  const [users, setUsers] = React.useState([]);
  const [newUser, setNewUser] = React.useState({
    name: "",
    role: "employee",
    employeeType: "full-time",
    managerId: "",
  });
  const [editingUser, setEditingUser] = React.useState(null);

  const fetchUsers = React.useCallback(async () => {
    const res = await fetch(`${API_URL}/admin/all-users`);
    setUsers(await res.json());
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_URL}/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      setNotification({
        type: "success",
        message: `User ${newUser.name} added. You can now edit them to set leave balances.`,
      });
      setNewUser({
        name: "",
        role: "employee",
        employeeType: "full-time",
        managerId: "",
      });
      fetchUsers();
    } catch (err) {
      setNotification({ type: "error", message: "Failed to add user" });
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete ${userName}?`)) return;
    try {
      await fetch(`${API_URL}/admin/users/${userId}`, { method: "DELETE" });
      setNotification({
        type: "success",
        message: `User ${userName} deleted.`,
      });
      fetchUsers();
    } catch (err) {
      setNotification({ type: "error", message: "Failed to delete user." });
    }
  };

  const potentialManagers = users.filter((u) => u.role === "manager");

  return (
    <div className="space-y-6">
      {editingUser && (
        <EditUserModal
          user={editingUser}
          allUsers={users}
          onCancel={() => setEditingUser(null)}
          onSave={() => {
            setEditingUser(null);
            fetchUsers();
          }}
          setNotification={setNotification}
        />
      )}
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-2">
          Add New User
        </h4>
        <form
          onSubmit={handleAddUser}
          className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-lg"
        >
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              required
              className="mt-1 w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="mt-1 w-full p-2 border rounded-md"
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Manager
            </label>
            <select
              value={newUser.managerId}
              onChange={(e) =>
                setNewUser({ ...newUser, managerId: e.target.value })
              }
              className="mt-1 w-full p-2 border rounded-md"
            >
              <option value="">-- No Manager --</option>
              {potentialManagers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 h-10"
          >
            Add User
          </button>
        </form>
      </div>
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-2">
          Existing Users
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Manager
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 whitespace-nowrap">{u.name}</td>
                  <td className="px-4 py-2 whitespace-nowrap capitalize">
                    {u.role}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {users.find((m) => m.id === u.managerId)?.name || "N/A"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap space-x-4">
                    <button
                      onClick={() => setEditingUser(u)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SettingsManagement = ({ setNotification }) => {
  const [config, setConfig] = React.useState(null);
  const [newHoliday, setNewHoliday] = React.useState("");
  React.useEffect(() => {
    const fetchConfig = async () => {
      const res = await fetch(`${API_URL}/config`);
      setConfig(await res.json());
    };
    fetchConfig();
  }, []);
  const handleSave = async () => {
    try {
      await fetch(`${API_URL}/admin/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setNotification({ type: "success", message: "System settings saved." });
    } catch (err) {
      setNotification({ type: "error", message: "Failed to save settings" });
    }
  };
  const handleHolidayAdd = () => {
    if (newHoliday && !config.holidays.includes(newHoliday)) {
      setConfig({
        ...config,
        holidays: [...config.holidays, newHoliday].sort(),
      });
      setNewHoliday("");
    }
  };
  const handleHolidayRemove = (holidayToRemove) => {
    setConfig({
      ...config,
      holidays: config.holidays.filter((h) => h !== holidayToRemove),
    });
  };
  if (!config) return <p>Loading settings...</p>;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 mb-2">
            Leave Quotas (Per Month)
          </h4>
          <textarea
            className="w-full h-40 p-2 font-mono text-sm border rounded-md"
            value={JSON.stringify(config.leaveQuotas, null, 2)}
            onChange={(e) => {
              try {
                setConfig({
                  ...config,
                  leaveQuotas: JSON.parse(e.target.value),
                });
              } catch (err) {}
            }}
          />
        </div>
        <div>
          <h4 className="text-lg font-semibold text-gray-800 mb-2">
            General Settings
          </h4>
          <textarea
            className="w-full h-40 p-2 font-mono text-sm border rounded-md"
            value={JSON.stringify(config.settings, null, 2)}
            onChange={(e) => {
              try {
                setConfig({ ...config, settings: JSON.parse(e.target.value) });
              } catch (err) {}
            }}
          />
        </div>
      </div>
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-2">
          Public Holidays
        </h4>
        <div className="flex gap-2 mb-2">
          <input
            type="date"
            value={newHoliday}
            onChange={(e) => setNewHoliday(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
          <button
            onClick={handleHolidayAdd}
            className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300"
          >
            Add
          </button>
        </div>
        <div className="space-y-1">
          {config.holidays.map((h) => (
            <div
              key={h}
              className="flex justify-between items-center bg-gray-50 p-2 rounded-md"
            >
              <span>{h}</span>
              <button onClick={() => handleHolidayRemove(h)}>
                <Trash2 size={14} className="text-red-500" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="text-right">
        <button
          onClick={handleSave}
          className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
        >
          Save All Settings
        </button>
      </div>
    </div>
  );
};
const ReportsAndLogs = ({ setNotification }) => {
  const [allLeaves, setAllLeaves] = React.useState([]);
  React.useEffect(() => {
    const fetchLeaves = async () => {
      const res = await fetch(`${API_URL}/admin/all-leaves`);
      setAllLeaves(await res.json());
    };
    fetchLeaves();
  }, []);
  const downloadCSV = () => {
    const headers =
      "id,userId,userName,leaveType,startDate,endDate,status,appliedOn,reason\n";
    const rows = allLeaves
      .map((l) =>
        [
          l.id,
          l.userId,
          `"${l.userName}"`,
          l.leaveType,
          l.startDate,
          l.endDate,
          l.status,
          l.appliedOn,
          `"${l.reason}"`,
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([headers + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `leave_report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotification({ type: "success", message: "Report downloaded." });
  };
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-semibold text-gray-800">
          All Leave Requests
        </h4>
        <button
          onClick={downloadCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
        >
          <FileText size={16} /> Download CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                User
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Dates
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {allLeaves.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2 whitespace-nowrap">{l.userName}</td>
                <td className="px-4 py-2 whitespace-nowrap capitalize">
                  {l.leaveType}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {formatDate(l.startDate)} to {formatDate(l.endDate)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap capitalize">
                  {l.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
const AdminPanel = ({ setNotification }) => {
  const [activeTab, setActiveTab] = React.useState("users");
  const resetData = async () => {
    if (!window.confirm("This will reset all data. Are you sure?")) return;
    try {
      await fetch(`${API_URL}/admin/reset-data`, { method: "POST" });
      setNotification({ type: "success", message: "Data has been reset." });
      window.location.reload();
    } catch (err) {
      setNotification({ type: "error", message: "Failed to reset data." });
    }
  };
  const tabs = [
    { id: "users", label: "User Management", icon: Users },
    { id: "settings", label: "System Settings", icon: Settings },
    { id: "reports", label: "Reports & Logs", icon: FileText },
  ];
  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mt-6">
      <div className="flex justify-between items-center border-b pb-4 mb-4">
        <h3 className="text-xl font-bold text-gray-800 flex items-center">
          <Shield className="mr-2 text-indigo-500" /> Admin Control Panel
        </h3>
        <button
          onClick={resetData}
          className="bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200 text-sm flex items-center gap-2"
        >
          <RefreshCw size={14} /> Reset Mock Data
        </button>
      </div>
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 -mb-px border-b-2 ${
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-6">
        {activeTab === "users" && (
          <UserManagement setNotification={setNotification} />
        )}
        {activeTab === "settings" && (
          <SettingsManagement setNotification={setNotification} />
        )}
        {activeTab === "reports" && (
          <ReportsAndLogs setNotification={setNotification} />
        )}
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [loginUsers, setLoginUsers] = React.useState([]);
  const [userData, setUserData] = React.useState(null);
  const [userLeaves, setUserLeaves] = React.useState([]);
  const [config, setConfig] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [notification, setNotification] = React.useState(null);
  const [activeUser, setActiveUser] = React.useState(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeUser) {
        const [userRes, configRes, leavesRes] = await Promise.all([
          fetch(`${API_URL}/users/${activeUser}`),
          fetch(`${API_URL}/config`),
          fetch(`${API_URL}/leaves/user/${activeUser}`),
        ]);
        setUserData(await userRes.json());
        setConfig(await configRes.json());
        setUserLeaves(await leavesRes.json());
      } else {
        const response = await fetch(`${API_URL}/users`);
        setLoginUsers(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setNotification({
        type: "error",
        message: "Could not load portal data. Is the backend running?",
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeUser]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleUserChange = (userId) => {
    setActiveUser(userId);
  };

  if (!activeUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg text-center">
          <h1 className="text-3xl font-bold text-indigo-600 mb-2">
            HRMS Portal
          </h1>
          <p className="text-gray-600 mb-6">Leave Management</p>
          <p className="text-lg font-semibold text-gray-800 mb-4">
            Select a user to log in as:
          </p>
          <div className="space-y-3">
            {isLoading ? (
              <p>Loading users...</p>
            ) : (
              loginUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserChange(user.id)}
                  className="w-full flex items-center text-left p-4 bg-gray-100 hover:bg-indigo-100 rounded-lg transition-colors duration-200"
                >
                  {user.role === "employee" && (
                    <User className="mr-3 text-indigo-500" />
                  )}
                  {user.role === "manager" && (
                    <Users className="mr-3 text-indigo-500" />
                  )}
                  {user.role === "admin" && (
                    <Shield className="mr-3 text-indigo-500" />
                  )}
                  <div>
                    <span className="font-bold text-gray-900">{user.name}</span>
                    <span className="block text-sm text-gray-500 capitalize">
                      {user.role}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }
  if (isLoading || !userData || !config) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>Loading Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">HRMS Portal</h1>
          <div className="flex items-center">
            <div className="text-right mr-4">
              <p className="font-semibold text-gray-800">{userData.name}</p>
              <p className="text-sm text-gray-500 capitalize">
                {userData.role}
              </p>
            </div>
            <button
              onClick={() => setActiveUser(null)}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Notification info={notification} />
        <LeaveBalanceCard balances={userData.leaveBalances} />
        {userData.role !== "admin" && (
          <ApplyLeaveForm
            userId={userData.id}
            config={config}
            setNotification={setNotification}
            refreshData={fetchData}
          />
        )}
        <LeaveHistory
          leaves={userLeaves}
          setNotification={setNotification}
          refreshData={fetchData}
        />
        {userData.role === "manager" && (
          <ManagerView
            managerId={userData.id}
            setNotification={setNotification}
            refreshData={fetchData}
          />
        )}
        {userData.role === "admin" && (
          <AdminPanel setNotification={setNotification} />
        )}
      </main>
    </div>
  );
}
