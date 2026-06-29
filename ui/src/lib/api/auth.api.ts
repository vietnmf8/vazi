import { apiClient } from "../api-client";

export interface LoginBodyDto {
    email: string;
    password: string;
}

export interface AuthUser {
    id: string;
    email: string;
    role: string;
}

export interface LoginResponse {
    token: string;
    user: AuthUser;
}

export const authApi = {
    login: (data: LoginBodyDto) =>
        apiClient.post<{ success: boolean; data: LoginResponse }>("/v1/auth/login", data),
};
