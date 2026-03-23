import { API_BASE_URL } from "../constants";
import { AuthService } from "./authService";

export class AdminService {
  private static async getAuthHeaders() {
    const authState = AuthService.getAuthState();
    if (!authState.token) throw new Error("Not authenticated");
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authState.token}`
    };
  }

  static async updateUser(userId: string, updates: any) {
    const response = await fetch(`${API_BASE_URL}/admin/update-user`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ userId, updates })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update user");
    }
    return response.json();
  }

  static async changePassword(userId: string, newPassword: string) {
    const response = await fetch(`${API_BASE_URL}/admin/change-password`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ userId, newPassword })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to change password");
    }
    return response.json();
  }

  static async toggleStatus(userId: string, disabled: boolean) {
    const response = await fetch(`${API_BASE_URL}/admin/toggle-status`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ userId, disabled })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to toggle status");
    }
    return response.json();
  }

  static async deleteUser(userId: string) {
    const response = await fetch(`${API_BASE_URL}/admin/delete-user`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ userId })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete user");
    }
    return response.json();
  }
}
