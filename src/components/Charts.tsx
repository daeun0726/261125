"use client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const BLUE = "#0b3d91";

export function BarCount({ data, height = 240 }: { data: { name: string; count: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: "#334155" }} />
        <Tooltip formatter={(v) => [`${v}건`, "보고서"]} />
        <Bar dataKey="count" fill={BLUE} radius={[0, 4, 4, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthLine({ data }: { data: { month: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ left: -16, right: 16, top: 8, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} interval={2} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
        <Tooltip formatter={(v) => [`${v}건`, "보고서"]} />
        <Line type="monotone" dataKey="count" stroke={BLUE} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
