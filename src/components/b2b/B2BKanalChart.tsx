"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export const B2B_CHANNELS = [
  { key: "schrankerl",  label: "Schrankerl",              color: "#E94E1B" },
  { key: "ritualVend",  label: "Ritual Vend",             color: "#FF8A50" },
  { key: "gurkerl",     label: "Gurkerl",                 color: "#D4FF3F" },
  { key: "ototo",       label: "Ototo",                   color: "#6BCB9E" },
  { key: "alfies",      label: "Alfies",                  color: "#A78BFA" },
  { key: "billa",       label: "Billa/REWE/Ja!Natürlich", color: "#FBBF24" },
  { key: "catering",    label: "Catering & Events",       color: "#94A3B8" },
] as const;

export type ChannelKey = (typeof B2B_CHANNELS)[number]["key"];

export interface B2BMonthRow {
  month: string;
  schrankerl: number;
  ritualVend: number;
  gurkerl: number;
  ototo: number;
  alfies: number;
  billa: number;
  catering: number;
}

export const B2B_DATA: B2BMonthRow[] = [
  { month:"Aug '24", schrankerl:0,     ritualVend:0,   gurkerl:0,    ototo:0,    alfies:0,    billa:0,     catering:724   },
  { month:"Sep '24", schrankerl:0,     ritualVend:0,   gurkerl:0,    ototo:0,    alfies:0,    billa:4072,  catering:18613 },
  { month:"Okt '24", schrankerl:2250,  ritualVend:0,   gurkerl:2080, ototo:372,  alfies:0,    billa:6337,  catering:28545 },
  { month:"Nov '24", schrankerl:2897,  ritualVend:0,   gurkerl:1291, ototo:547,  alfies:0,    billa:12823, catering:34959 },
  { month:"Dez '24", schrankerl:3314,  ritualVend:0,   gurkerl:875,  ototo:2475, alfies:0,    billa:9773,  catering:10778 },
  { month:"Jan '25", schrankerl:15776, ritualVend:0,   gurkerl:904,  ototo:1197, alfies:0,    billa:10276, catering:28033 },
  { month:"Feb '25", schrankerl:15998, ritualVend:0,   gurkerl:645,  ototo:636,  alfies:0,    billa:7707,  catering:16594 },
  { month:"Mär '25", schrankerl:13521, ritualVend:0,   gurkerl:891,  ototo:705,  alfies:0,    billa:7065,  catering:13438 },
  { month:"Apr '25", schrankerl:15728, ritualVend:0,   gurkerl:329,  ototo:541,  alfies:0,    billa:8911,  catering:27217 },
  { month:"Mai '25", schrankerl:12649, ritualVend:0,   gurkerl:799,  ototo:369,  alfies:0,    billa:3706,  catering:24766 },
  { month:"Jun '25", schrankerl:13002, ritualVend:0,   gurkerl:548,  ototo:685,  alfies:0,    billa:5284,  catering:6411  },
  { month:"Jul '25", schrankerl:16720, ritualVend:0,   gurkerl:317,  ototo:697,  alfies:0,    billa:7461,  catering:11072 },
  { month:"Aug '25", schrankerl:12546, ritualVend:0,   gurkerl:563,  ototo:709,  alfies:0,    billa:11091, catering:42666 },
  { month:"Sep '25", schrankerl:14161, ritualVend:0,   gurkerl:596,  ototo:559,  alfies:0,    billa:3219,  catering:43780 },
  { month:"Okt '25", schrankerl:18593, ritualVend:0,   gurkerl:0,    ototo:401,  alfies:0,    billa:5743,  catering:34783 },
  { month:"Nov '25", schrankerl:16913, ritualVend:0,   gurkerl:560,  ototo:976,  alfies:0,    billa:9478,  catering:20834 },
  { month:"Dez '25", schrankerl:3832,  ritualVend:0,   gurkerl:595,  ototo:1488, alfies:0,    billa:3112,  catering:7997  },
  { month:"Jan '26", schrankerl:18078, ritualVend:0,   gurkerl:0,    ototo:1061, alfies:0,    billa:2427,  catering:17426 },
  { month:"Feb '26", schrankerl:16062, ritualVend:0,   gurkerl:0,    ototo:653,  alfies:0,    billa:1818,  catering:14969 },
  { month:"Mär '26", schrankerl:18299, ritualVend:0,   gurkerl:575,  ototo:546,  alfies:1724, billa:5776,  catering:28978 },
  { month:"Apr '26", schrankerl:14333, ritualVend:0,   gurkerl:561,  ototo:898,  alfies:550,  billa:2174,  catering:10552 },
  { month:"Mai '26", schrankerl:15910, ritualVend:0,   gurkerl:0,    ototo:112,  alfies:0,    billa:0,     catering:12449 },
  { month:"Jun '26", schrankerl:17688, ritualVend:0,   gurkerl:564,  ototo:511,  alfies:0,    billa:0,     catering:12717 },
  { month:"Jul '26", schrankerl:14450, ritualVend:932, gurkerl:0,    ototo:722,  alfies:554,  billa:0,     catering:4958  },
  { month:"Aug '26", schrankerl:13011, ritualVend:424, gurkerl:502,  ototo:151,  alfies:0,    billa:1818,  catering:3347  },
  { month:"Sep '26", schrankerl:6808,  ritualVend:301, gurkerl:557,  ototo:0,    alfies:554,  billa:0,     catering:5570  },
];

const fmtK = (v: number) =>
  v >= 1000
    ? `€ ${Math.round(v / 1000).toLocaleString("de-AT")}k`
    : `€ ${Math.round(v)}`;

const fmtFull = (v: number) =>
  `€ ${Math.round(v).toLocaleString("de-AT")}`;

export function B2BKanalChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={B2B_DATA} margin={{ top: 4, right: 4, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,26,26,0.06)" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: "#999" }}
          angle={-40}
          textAnchor="end"
          interval={1}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#999" }}
          tickFormatter={fmtK}
          width={52}
        />
        <Tooltip
          formatter={(value, name) => [typeof value === "number" ? fmtFull(value) : String(value), String(name)]}
          labelStyle={{ fontWeight: 600, marginBottom: 4 }}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid rgba(26,26,26,0.1)",
            fontSize: 12,
          }}
        />
        <Legend
          wrapperStyle={{ paddingTop: 8, fontSize: 11 }}
          iconType="circle"
          iconSize={8}
        />
        {B2B_CHANNELS.map((ch) => (
          <Bar
            key={ch.key}
            dataKey={ch.key}
            name={ch.label}
            stackId="a"
            fill={ch.color}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
