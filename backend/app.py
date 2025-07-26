import datetime
import time
from flask import Flask, jsonify, request
from flask_cors import CORS
from copy import deepcopy
import uuid

# --- Initializing the App ---
app = Flask(__name__)
CORS(app)

# --- IN-MEMORY DATABASE (Mock Data) ---
# The MASTER copy is used for resetting the data.
MOCK_USERS_MASTER = {
    "emp1": {"id": "emp1", "name": "Uday (Employee)", "role": "employee", "managerId": "mgr1", "employeeType": "full-time", "leaveBalances": {"sick": 5, "casual": 7, "vacation": 10, "lop": 0, "compOff": 2}},
    "mgr1": {"id": "mgr1", "name": "Syl (Manager)", "role": "manager", "managerId": "adm1", "employeeType": "full-time", "leaveBalances": {"sick": 5, "casual": 5, "vacation": 12, "lop": 0, "compOff": 0}},
    "adm1": {"id": "adm1", "name": "Kaladin (Admin)", "role": "admin", "managerId": None, "employeeType": "full-time", "leaveBalances": {"sick": 8, "casual": 8, "vacation": 15, "lop": 0, "compOff": 0}}
}

MOCK_LEAVE_REQUESTS_MASTER = [
    {"id": "leave_emp1_1721989800", "userId": "emp1", "userName": "Uday (Employee)", "managerId": "mgr1", "leaveType": "sick", "startDate": "2025-07-20", "endDate": "2025-07-20", "reason": "Fever", "status": "approved", "appliedOn": "2025-07-19"},
    {"id": "leave_emp1_1721999800", "userId": "emp1", "userName": "Uday (Employee)", "managerId": "mgr1", "leaveType": "casual", "startDate": "2025-08-05", "endDate": "2025-08-05", "reason": "Personal work", "status": "pending", "appliedOn": "2025-07-24"},
]

MOCK_CONFIG_MASTER = {
    "leaveQuotas": {"full-time": {"sick": 1, "casual": 1, "vacation": 1.5}, "intern": {"sick": 0.5, "casual": 0.5, "vacation": 0}, "trainee": {"sick": 0.5, "casual": 0.5, "vacation": 0}},
    "holidays": ["2025-01-01", "2025-01-26", "2025-08-15", "2025-10-02", "2025-12-25"],
    "settings": {"advanceNoticeDays": 3, "maxLOPs": 10, "carryForwardCap": 5}
}

# --- Global variables to act as our live database ---
db_users = deepcopy(MOCK_USERS_MASTER)
db_leaves = deepcopy(MOCK_LEAVE_REQUESTS_MASTER)
db_config = deepcopy(MOCK_CONFIG_MASTER)

# --- Helper Function ---
def get_day_difference(start_date_str, end_date_str):
    start = datetime.datetime.strptime(start_date_str, "%Y-%m-%d")
    end = datetime.datetime.strptime(end_date_str, "%Y-%m-%d")
    return (end - start).days + 1

# === PUBLIC ROUTES ===

@app.route('/api/users', methods=['GET'])
def get_all_users_for_login():
    login_users = [{"id": u_id, "name": u_data["name"], "role": u_data["role"]} for u_id, u_data in db_users.items()]
    return jsonify(login_users)

@app.route('/api/users/<user_id>', methods=['GET'])
def get_user_by_id(user_id):
    user = db_users.get(user_id)
    if user: return jsonify(user)
    return jsonify({"error": "User not found"}), 404

@app.route('/api/config', methods=['GET'])
def get_config():
    return jsonify(db_config)

@app.route('/api/leaves/user/<user_id>', methods=['GET'])
def get_leaves_for_user(user_id):
    user_leaves = [leave for leave in db_leaves if leave['userId'] == user_id]
    user_leaves.sort(key=lambda x: x['appliedOn'], reverse=True)
    return jsonify(user_leaves)

@app.route('/api/leaves', methods=['POST'])
def apply_for_leave():
    data = request.json
    new_leave = {
        "id": f"leave_{data['userId']}_{int(time.time())}", "userId": data['userId'],
        "userName": db_users[data['userId']]['name'], "managerId": db_users[data['userId']]['managerId'],
        "leaveType": data['leaveType'], "startDate": data['startDate'], "endDate": data['endDate'],
        "reason": data['reason'], "status": 'pending', "appliedOn": datetime.date.today().isoformat()
    }
    db_leaves.append(new_leave)
    return jsonify(new_leave), 201

@app.route('/api/leaves/<leave_id>/cancel', methods=['PUT'])
def cancel_leave(leave_id):
    leave = next((l for l in db_leaves if l['id'] == leave_id), None)
    if not leave: return jsonify({"error": "Leave request not found"}), 404
    leave['status'] = 'cancelled'
    return jsonify({"message": "Leave cancelled successfully", "leave": leave})

@app.route('/api/leaves/manager/<manager_id>', methods=['GET'])
def get_pending_requests_for_manager(manager_id):
    pending_leaves = [leave for leave in db_leaves if leave['managerId'] == manager_id and leave['status'] == 'pending']
    return jsonify(pending_leaves)

@app.route('/api/leaves/<leave_id>/decide', methods=['PUT'])
def decide_on_leave(leave_id):
    data, new_status = request.json, data.get('status')
    leave = next((l for l in db_leaves if l['id'] == leave_id), None)
    if not leave: return jsonify({"error": "Leave request not found"}), 404
    leave['status'] = new_status
    if new_status == 'approved' and leave['leaveType'] != 'wfh':
        user = db_users.get(leave['userId'])
        if user:
            days, l_type = get_day_difference(leave['startDate'], leave['endDate']), leave['leaveType']
            key = 'compOff' if l_type == 'comp-off' else l_type
            if key in user['leaveBalances']:
                if user['leaveBalances'][key] >= days: user['leaveBalances'][key] -= days
                else:
                    rem_days = days - user['leaveBalances'][key]
                    user['leaveBalances'][key], user['leaveBalances']['lop'] = 0, user['leaveBalances'].get('lop', 0) + rem_days
            else: user['leaveBalances']['lop'] = user['leaveBalances'].get('lop', 0) + days
    return jsonify({"message": f"Leave {new_status} successfully", "leave": leave})

# === ADMIN ROUTES ===

@app.route('/api/admin/reset-data', methods=['POST'])
def reset_data():
    global db_users, db_leaves, db_config
    db_users = deepcopy(MOCK_USERS_MASTER)
    db_leaves = deepcopy(MOCK_LEAVE_REQUESTS_MASTER)
    db_config = deepcopy(MOCK_CONFIG_MASTER)
    return jsonify({"message": "Mock data has been reset to default."})

@app.route('/api/admin/all-users', methods=['GET'])
def admin_get_all_users():
    return jsonify(list(db_users.values()))

@app.route('/api/admin/users', methods=['POST'])
def admin_add_user():
    data = request.json
    new_id = f"emp_{uuid.uuid4().hex[:6]}"
    db_users[new_id] = {
        "id": new_id, "name": data['name'], "role": data['role'],
        "managerId": data.get('managerId') or None, "employeeType": data['employeeType'],
        "leaveBalances": {"sick": 0, "casual": 0, "vacation": 0, "lop": 0, "compOff": 0}
    }
    return jsonify(db_users[new_id]), 201

@app.route('/api/admin/users/<user_id>', methods=['PUT'])
def admin_update_user(user_id):
    if user_id not in db_users: return jsonify({"error": "User not found"}), 404
    data = request.json
    db_users[user_id].update(data)
    return jsonify(db_users[user_id])

@app.route('/api/admin/users/<user_id>', methods=['DELETE'])
def admin_delete_user(user_id):
    if user_id not in db_users: return jsonify({"error": "User not found"}), 404
    del db_users[user_id]
    return jsonify({"message": f"User {user_id} deleted."})

@app.route('/api/admin/config', methods=['PUT'])
def admin_update_config():
    global db_config
    db_config = request.json
    return jsonify(db_config)

@app.route('/api/admin/all-leaves', methods=['GET'])
def admin_get_all_leaves():
    return jsonify(sorted(db_leaves, key=lambda x: x['appliedOn'], reverse=True))

# --- Main Execution ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)