import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { useEffect, useState } from "react";
import { checklistService } from "@/services/checklistService";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Loader2, TrendingUp, CheckCircle2, ClipboardList, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type AnalyticsData = Awaited<ReturnType<typeof checklistService.getAnalyticsData>>;

const COLORS = {
  ok: "hsl(var(--success))",
  nok: "hsl(var(--destructive))",
  trend: "hsl(var(--primary))",
};

const Analytics = () => {
  const { activeUnitId, isSuperAdmin } = usePermissions();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const result = await checklistService.getAnalyticsData(activeUnitId || undefined, !!isSuperAdmin, 7);
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeUnitId, isSuperAdmin]);

  const kpis = [
    {
      label: "Conformidade Geral",
      value: `${data?.overallCompliance ?? 0}%`,
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Checklists Executados",
      value: data?.totalRuns ?? 0,
      icon: ClipboardList,
      color: "text-muted-foreground",
      bg: "bg-muted",
    },
    {
      label: "Concluídos",
      value: data?.totalComplete ?? 0,
      icon: CheckCircle2,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Com Falhas",
      value: data?.dailyData.reduce((a, d) => a + d.naoConformes, 0) ?? 0,
      icon: XCircle,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  ];

  return (
    <AppLayout title="Analytics">
      <PageHeader
        title="Analytics"
        subtitle="Conformidade e tendências operacionais — últimos 7 dias"
      />

      <div className="p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className="bg-card border rounded-xl p-4 flex flex-col gap-2 shadow-sm">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", kpi.bg)}>
                      <Icon className={cn("w-5 h-5", kpi.color)} />
                    </div>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Conformidade ao longo do Tempo */}
            <div className="bg-card border rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-sm mb-1">Conformidade por Dia</h3>
              <p className="text-xs text-muted-foreground mb-4">% de checklists sem falhas nos últimos 7 dias</p>
              {data && data.dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={data.dailyData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <defs>
                      <linearGradient id="conformidadeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.trend} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={COLORS.trend} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v: number) => [`${v}%`, "Conformidade"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="conformidade"
                      stroke={COLORS.trend}
                      strokeWidth={2}
                      fill="url(#conformidadeGrad)"
                      dot={{ r: 4, fill: COLORS.trend }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados suficientes para exibir o gráfico.</p>
              )}
            </div>

            {/* Conformes vs Não-conformes por tipo */}
            <div className="bg-card border rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-sm mb-1">Falhas por Turno</h3>
              <p className="text-xs text-muted-foreground mb-4">Comparativo entre Conformes e Não-conformes</p>
              {data && data.typeBreakdown.some(t => t.conformes + t.naoConformes > 0) ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.typeBreakdown} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="conformes" name="Conformes" fill={COLORS.ok} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="naoConformes" name="Não-Conformes" fill={COLORS.nok} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir.</p>
              )}
            </div>

            {/* Daily Breakdown Table */}
            {data && data.dailyData.length > 0 && (
              <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b">
                  <h3 className="font-bold text-sm">Detalhe Diário</h3>
                </div>
                <div className="divide-y">
                  {data.dailyData.map((d) => (
                    <div key={d.day} className="flex items-center px-4 py-3 gap-4">
                      <span className="text-sm font-medium w-14 text-muted-foreground">{d.day}</span>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${d.conformidade}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-sm font-bold w-12 text-right",
                          d.conformidade >= 80 ? "text-success" : d.conformidade >= 50 ? "text-warning" : "text-destructive"
                        )}
                      >
                        {d.conformidade}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Analytics;
