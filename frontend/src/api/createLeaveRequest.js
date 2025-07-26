// src/api/createLeaveRequest.js
import { databases, ID } from "../appwriteConfig";

const DATABASE_ID = "your_database_id";
const COLLECTION_ID = "leave_requests";

export const createLeaveRequest = async (data) => {
  try {
    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID,
      ID.unique(),
      {
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
        status: "pending", // default
        userId: data.userId, // set this from auth session
      }
    );
    return response;
  } catch (error) {
    console.error("❌ Failed to create leave:", error.message);
    throw error;
  }
};
