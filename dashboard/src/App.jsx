import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";

const PRESIGNED_URL = "UR presigned goes here";

const colors = {
  bg: "#0a0a0b",
  surface: "#141416",
  surfaceHover: "#1a1a1d",
  border: "#27272a",
  borderLight: "#3f3f46",
  text: "#fafafa",
  textMuted: "#a1a1aa",
  textDim: "#71717a",
  accent: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  successBg: "rgba(16, 185, 129, 0.1)",
  warningBg: "rgba(245, 158, 11, 0.1)",
  dangerBg: "rgba(239, 68, 68, 0.1)",
};

function KpiCard({ label, value, sublabel, trend, accent }) {
  const accentColor =
    accent === "success"
      ? colors.success
      : accent === "warning"
      ? colors.warning
      : accent === "danger"
      ? colors.danger
      : colors.accent;

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: "20px 22px",
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: colors.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: colors.text,
          marginBottom: 6,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {sublabel && (
        <div
          style={{
            fontSize: 13,
            color: trend ? accentColor : colors.textDim,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {trend && <span>{trend === "up" ? "↑" : "↓"}</span>}
          {sublabel}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    healthy: {
      bg: colors.successBg,
      color: colors.success,
      label: "● Healthy",
    },
    warning: {
      bg: colors.warningBg,
      color: colors.warning,
      label: "● Warning",
    },
    critical: {
      bg: colors.dangerBg,
      color: colors.danger,
      label: "● Critical",
    },
  }[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: config.bg,
        color: config.color,
        padding: "4px 10px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {config.label}
    </span>
  );
}

function ForecastBar({ forecast }) {
  if (!forecast) return null;
  const pct =
    forecast.budget > 0
      ? Math.min((forecast.projected_total / forecast.budget) * 100, 100)
      : 0;
  const status = forecast.over_budget
    ? "critical"
    : pct > 80
    ? "warning"
    : "healthy";
  const fillColor = forecast.over_budget
    ? colors.danger
    : pct > 80
    ? colors.warning
    : colors.success;

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: "24px 26px",
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: colors.text,
              margin: 0,
              marginBottom: 4,
            }}
          >
            Month-to-date forecast
          </h2>
          <p
            style={{
              fontSize: 13,
              color: colors.textMuted,
              margin: 0,
            }}
          >
            Tracking against your ${forecast.budget} monthly budget
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div
        style={{
          background: colors.bg,
          borderRadius: 8,
          height: 36,
          overflow: "hidden",
          position: "relative",
          border: `1px solid ${colors.border}`,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: fillColor,
            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            borderRadius: 7,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 12,
            transform: "translateY(-50%)",
            fontSize: 12,
            fontWeight: 600,
            color: colors.text,
          }}
        >
          {pct.toFixed(1)}% used
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginTop: 18,
          paddingTop: 18,
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        {[
          {
            label: "Spent so far",
            value: `$${forecast.actual_so_far.toFixed(2)}`,
          },
          {
            label: "Projected total",
            value: `$${forecast.projected_total.toFixed(2)}`,
            color: fillColor,
          },
          { label: "Budget ceiling", value: `$${forecast.budget.toFixed(2)}` },
        ].map((stat, i) => (
          <div key={i}>
            <div
              style={{
                fontSize: 11,
                color: colors.textDim,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 4,
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: stat.color || colors.text,
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CostChart({ services }) {
  if (!services || services.length === 0) {
    return (
      <div
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: "60px 26px",
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📊</div>
        <h3 style={{ fontSize: 16, color: colors.text, margin: "0 0 6px" }}>
          No cost data yet
        </h3>
        <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>
          AWS Cost Explorer takes ~24 hours to populate data after your first
          resources are deployed.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: "24px 26px",
        marginBottom: 24,
      }}
    >
      <h2
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: colors.text,
          margin: "0 0 4px",
        }}
      >
        Spend by service
      </h2>
      <p
        style={{
          fontSize: 13,
          color: colors.textMuted,
          margin: "0 0 20px",
        }}
      >
        Today vs. yesterday · top 10 services
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={services}
          margin={{ top: 8, right: 8, left: 0, bottom: 60 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={colors.border}
            vertical={false}
          />
          <XAxis
            dataKey="service"
            tick={{ fontSize: 11, fill: colors.textMuted }}
            angle={-35}
            textAnchor="end"
            interval={0}
            axisLine={{ stroke: colors.border }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: colors.textMuted }}
            tickFormatter={(v) => `$${v}`}
            axisLine={{ stroke: colors.border }}
          />
          <Tooltip
            contentStyle={{
              background: colors.bg,
              border: `1px solid ${colors.borderLight}`,
              borderRadius: 8,
              fontSize: 13,
            }}
            labelStyle={{ color: colors.text }}
            formatter={(v) => [`$${v}`, ""]}
          />
          <Bar
            dataKey="yesterday"
            name="Yesterday"
            fill={colors.textDim}
            radius={[4, 4, 0, 0]}
          />
          <Bar dataKey="today" name="Today" radius={[4, 4, 0, 0]}>
            {services.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.flagged ? colors.danger : colors.accent}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 12,
          fontSize: 12,
          color: colors.textMuted,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 10,
              height: 10,
              background: colors.textDim,
              borderRadius: 2,
            }}
          />
          Yesterday
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 10,
              height: 10,
              background: colors.accent,
              borderRadius: 2,
            }}
          />
          Today
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 10,
              height: 10,
              background: colors.danger,
              borderRadius: 2,
            }}
          />
          {"Flagged (>20% increase)"}
        </span>
      </div>
    </div>
  );
}

function TopMovers({ movers }) {
  if (!movers || movers.length === 0) return null;

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: "24px 26px",
        marginBottom: 24,
      }}
    >
      <h2
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: colors.text,
          margin: "0 0 4px",
        }}
      >
        Biggest movers
      </h2>
      <p
        style={{
          fontSize: 13,
          color: colors.textMuted,
          margin: "0 0 16px",
        }}
      >
        Services with the largest day-over-day swings
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
            {["Service", "Yesterday", "Today", "Change"].map((h, i) => (
              <th
                key={i}
                style={{
                  textAlign: i === 0 ? "left" : "right",
                  padding: "10px 12px",
                  fontSize: 11,
                  fontWeight: 500,
                  color: colors.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {movers.map((s, i) => (
            <tr
              key={s.service}
              style={{
                borderBottom:
                  i < movers.length - 1 ? `1px solid ${colors.border}` : "none",
              }}
            >
              <td
                style={{
                  padding: "14px 12px",
                  fontSize: 14,
                  color: colors.text,
                  fontWeight: 500,
                }}
              >
                {s.service}
              </td>
              <td
                style={{
                  textAlign: "right",
                  padding: "14px 12px",
                  fontSize: 14,
                  color: colors.textMuted,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ${s.yesterday.toFixed(2)}
              </td>
              <td
                style={{
                  textAlign: "right",
                  padding: "14px 12px",
                  fontSize: 14,
                  color: colors.text,
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ${s.today.toFixed(2)}
              </td>
              <td
                style={{
                  textAlign: "right",
                  padding: "14px 12px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: s.delta_pct > 0 ? colors.danger : colors.success,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {s.delta_pct > 0 ? "↑" : "↓"} {Math.abs(s.delta_pct).toFixed(1)}
                %
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(PRESIGNED_URL)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const wrapperStyle = {
    minHeight: "100vh",
    background: colors.bg,
    color: colors.text,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
    padding: "48px 24px",
  };

  if (loading) {
    return (
      <div style={wrapperStyle}>
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            textAlign: "center",
            padding: "100px 0",
          }}
        >
          <div style={{ fontSize: 14, color: colors.textMuted }}>
            Loading cost data...
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={wrapperStyle}>
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            textAlign: "center",
            padding: "100px 0",
          }}
        >
          <div style={{ fontSize: 14, color: colors.danger }}>
            Could not load cost data. Check your presigned URL or AWS
            configuration.
          </div>
        </div>
      </div>
    );
  }

  const todayTotal = data.services
    ? data.services.reduce((sum, s) => sum + s.today, 0)
    : 0;
  const yesterdayTotal = data.services
    ? data.services.reduce((sum, s) => sum + s.yesterday, 0)
    : 0;
  const dailyDelta =
    yesterdayTotal > 0
      ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
      : 0;
  const activeAlerts = data.alerts ? data.alerts.length : 0;
  const top10 = data.services ? data.services.slice(0, 10) : [];
  const budgetRemaining = data.forecast
    ? Math.max(0, data.forecast.budget - data.forecast.actual_so_far)
    : 0;

  return (
    <div style={wrapperStyle}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <header style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${colors.accent}, #6366f1)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              ⚡
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: colors.textMuted,
                letterSpacing: "0.02em",
              }}
            >
              FINOPS DASHBOARD
            </span>
          </div>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 700,
              margin: "0 0 8px",
              letterSpacing: "-0.03em",
              background: `linear-gradient(135deg, ${colors.text}, ${colors.textMuted})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            AWS Cost Intelligence
          </h1>
          <p
            style={{
              fontSize: 15,
              color: colors.textMuted,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Real-time spend monitoring with anomaly detection · Updated{" "}
            {data.date}
            {activeAlerts > 0 && (
              <span>
                {" · "}
                <span style={{ color: colors.danger, fontWeight: 500 }}>
                  {activeAlerts} active alert{activeAlerts > 1 ? "s" : ""}
                </span>
              </span>
            )}
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <KpiCard
            label="Today's spend"
            value={`$${todayTotal.toFixed(2)}`}
            sublabel={
              yesterdayTotal > 0
                ? `${Math.abs(dailyDelta).toFixed(1)}% vs yesterday`
                : "Baseline"
            }
            trend={dailyDelta > 0 ? "up" : dailyDelta < 0 ? "down" : null}
            accent={
              dailyDelta > 20
                ? "danger"
                : dailyDelta > 0
                ? "warning"
                : "success"
            }
          />
          <KpiCard
            label="Month projected"
            value={`$${
              data.forecast ? data.forecast.projected_total.toFixed(2) : "0.00"
            }`}
            sublabel={
              data.forecast && data.forecast.over_budget
                ? "Over budget"
                : "On track"
            }
            accent={
              data.forecast && data.forecast.over_budget ? "danger" : "success"
            }
          />
          <KpiCard
            label="Budget remaining"
            value={`$${budgetRemaining.toFixed(2)}`}
            sublabel={`of $${data.forecast ? data.forecast.budget : 0} monthly`}
          />
          <KpiCard
            label="Active alerts"
            value={activeAlerts}
            sublabel={
              activeAlerts === 0 ? "All services healthy" : "Requires attention"
            }
            accent={activeAlerts === 0 ? "success" : "danger"}
          />
        </div>

        <ForecastBar forecast={data.forecast} />
        <CostChart services={top10} />
        <TopMovers movers={data.top_movers} />

        <footer
          style={{
            marginTop: 60,
            paddingTop: 24,
            borderTop: `1px solid ${colors.border}`,
            fontSize: 12,
            color: colors.textDim,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            Built by Parth · Serverless FinOps tool · AWS Lambda + S3 +
            Cloudflare Pages
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <a
              href="https://github.com/yourusername/cost-dashboard"
              style={{ color: colors.textMuted, textDecoration: "none" }}
            >
              View source ↗
            </a>
            <span>
              Generated {data.generated_at && data.generated_at.split("T")[0]}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
