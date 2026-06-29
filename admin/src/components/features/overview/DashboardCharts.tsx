"use client";

import React from "react";
import {
 LineChart,
 Line,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
 PieChart,
 Pie,
 Cell,
 BarChart,
 Bar,
 FunnelChart,
 Funnel,
 LabelList,
 Legend
} from "recharts";
import type { AdminDashboardStats } from "@/types/api";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28DFF", "#FF6B6B"];

// 1. Bản đồ Nhiệt / Biểu đồ Cột Ngang - Quốc tịch
export function NationalityDistributionChart({ data }: { data: AdminDashboardStats["nationality_distribution"] }) {
 if (!data || data.length === 0) return <div className="text-center p-4 text-gray-500">No data</div>;
 return (
 <div className="h-[300px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3" horizontal={false} />
 <XAxis type="number" />
 <YAxis dataKey="nationality" type="category" width={80} />
 <Tooltip cursor={{ fill: "transparent" }} />
 <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]}>
 {data.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 );
}

// 2. Biểu đồ Đường - Doanh thu & Hồ sơ theo tháng
export function RevenueTrendChart({ data }: { data: AdminDashboardStats["revenue_trend"] }) {
 if (!data || data.length === 0) return <div className="text-center p-4 text-gray-500">No data</div>;
 return (
 <div className="h-[350px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} />
 <XAxis dataKey="month" />
 <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
 <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
 <Tooltip />
 <Legend />
 <Line yAxisId="left" type="monotone" dataKey="amount" name="Doanh thu ($)" stroke="#8884d8" strokeWidth={3} activeDot={{ r: 8 }} />
 <Line yAxisId="right" type="monotone" dataKey="count" name="Hồ sơ" stroke="#82ca9d" strokeWidth={3} />
 </LineChart>
 </ResponsiveContainer>
 </div>
 );
}

// 3. Biểu đồ Tròn - Cơ cấu dịch vụ Visa
export function VisaTypeDistributionChart({ data }: { data: AdminDashboardStats["visa_type_distribution"] }) {
 if (!data || data.length === 0) return <div className="text-center p-4 text-gray-500">No data</div>;
 return (
 <div className="h-[300px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={data}
 cx="50%"
 cy="50%"
 innerRadius={60}
 outerRadius={90}
 paddingAngle={5}
 dataKey="count"
 nameKey="type"
 label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
 >
 {data.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
 ))}
 </Pie>
 <Tooltip />
 <Legend verticalAlign="bottom" height={36} />
 </PieChart>
 </ResponsiveContainer>
 </div>
 );
}

// 4. Biểu đồ Cột Ngang - Top 5 Extra Services
export function ExtraServicesBarChart({ data }: { data: AdminDashboardStats["extra_services_distribution"] }) {
 if (!data || data.length === 0) return <div className="text-center p-4 text-gray-500">No data</div>;
 return (
 <div className="h-[300px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3" horizontal={false} />
 <XAxis type="number" />
 <YAxis dataKey="service" type="category" width={100} />
 <Tooltip cursor={{ fill: "transparent" }} />
 <Bar dataKey="count" fill="#ffc658" radius={[0, 4, 4, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 );
}

// 5. Biểu đồ Phễu - Hành trình chốt đơn
export function ConversionFunnelChart({ data }: { data: AdminDashboardStats["application_funnel"] }) {
 if (!data || data.length === 0) return <div className="text-center p-4 text-gray-500">No data</div>;
 return (
 <div className="h-[300px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <FunnelChart>
 <Tooltip />
 <Funnel
 dataKey="count"
 nameKey="stage"
 data={data}
 isAnimationActive
 >
 <LabelList position="right" fill="#000" stroke="none" dataKey="stage" />
 {data.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
 ))}
 </Funnel>
 </FunnelChart>
 </ResponsiveContainer>
 </div>
 );
}
