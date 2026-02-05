import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/ui/stat-card";
import { ModuleCard } from "@/components/ui/module-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  Package, 
  AlertTriangle, 
  ShoppingCart, 
  ClipboardCheck,
  GraduationCap,
  Utensils,
  Building2,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { hasPermission } from "@/lib/permissions";
import { useStockAlerts } from "@/hooks/useStockAlerts";
import { DishMock, useTrainings, TrainingStatus } from "@/contexts/TrainingsContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { role, baseRole, adminView } = usePermissions();
  const { count: criticalStockCount } = useStockAlerts();
  const {
    employees,
    trainings,
    dishes,
    trainingsLoading,
    trainingsError,
    reloadTrainings,
    addEmployee,
    addDish,
    assignDishToTraining,
    markTrainingCompleted,
  } = useTrainings();
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Usuário';
  
  // Use permissions to determine view
  const isManager = hasPermission(role || 'operator', 'manage_orders'); // Proxy for manager view
  const isAdmin = hasPermission(role || 'operator', 'manage_settings'); // Proxy for admin view
  const isAdminBase = baseRole === "admin" || baseRole === "super_admin";
  const [adminSelectedOperatorId, setAdminSelectedOperatorId] = useState<number | null>(null);
  const [managerSelectedOperatorId, setManagerSelectedOperatorId] = useState<number | null>(null);
  const [completedDishesByTraining, setCompletedDishesByTraining] = useState<Record<number, number[]>>({});
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newDishTitle, setNewDishTitle] = useState("");
  const [newDishDescription, setNewDishDescription] = useState("");
  const [newDishVideoUrl, setNewDishVideoUrl] = useState("");
  const [assignTrainingId, setAssignTrainingId] = useState<number | null>(null);
  const [assignDishId, setAssignDishId] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dishError, setDishError] = useState<string | null>(null);
  const [assignDishError, setAssignDishError] = useState<string | null>(null);

  // Mock data - será substituído por dados reais
  const stats = {
    criticalStock: criticalStockCount,
    pendingOrders: 5,
    delayedChecklists: 2,
    pendingTrainings: 4,
  };

  const operators = useMemo(
    () => employees.filter((employee) => employee.role === "OPERATOR"),
    [employees],
  );

  const dishesById = useMemo(() => new Map(dishes.map((dish) => [dish.id, dish])), [dishes]);

  const canAccessDashboard = !isAdminBase || adminView !== null;

  const extractYouTubeId = (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtube.com")) {
        if (parsed.pathname.startsWith("/shorts/")) {
          return parsed.pathname.split("/shorts/")[1]?.split("/")[0] ?? null;
        }
        if (parsed.pathname.startsWith("/embed/")) {
          return parsed.pathname.split("/embed/")[1]?.split("/")[0] ?? null;
        }
        return parsed.searchParams.get("v");
      }
      if (parsed.hostname === "youtu.be") {
        return parsed.pathname.replace("/", "");
      }
    } catch {
      return null;
    }
    return null;
  };

  const resolveVideoUrl = (url: string) => {
    const youtubeId = extractYouTubeId(url);
    if (youtubeId) {
      return `https://www.youtube.com/embed/${youtubeId}`;
    }
    return url;
  };

  type YouTubePlayerApi = {
    Player: new (
      elementId: string,
      options: {
        videoId: string;
        playerVars: Record<string, string | number>;
        events: {
          onReady: () => void;
          onStateChange: (event: { data: number }) => void;
        };
      },
    ) => YouTubePlayerInstance;
  };

  type YouTubePlayerInstance = {
    playVideo?: () => void;
    mute?: () => void;
    destroy?: () => void;
    getCurrentTime?: () => number;
    getDuration?: () => number;
  };

  const DishVideo = ({
    trainingId,
    dish,
    onCompleted,
    completed,
  }: {
    trainingId: number;
    dish: DishMock;
    onCompleted: () => void;
    completed: boolean;
  }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const playerRef = useRef<YouTubePlayerInstance | null>(null);
    const progressTimerRef = useRef<number | null>(null);
    const [playerReady, setPlayerReady] = useState(false);
    const [progress, setProgress] = useState(0);
    const youtubeId = extractYouTubeId(dish.videoUrl);
    const playerId = `yt-dashboard-player-${trainingId}-${dish.id}`;

    useEffect(() => {
      setProgress(0);
    }, [dish.videoUrl]);

    useEffect(() => {
      if (!youtubeId) return undefined;

      const initializePlayer = () => {
        const yt = (window as Window & { YT?: YouTubePlayerApi }).YT;
        if (!yt) return;
        playerRef.current = new yt.Player(playerId, {
          videoId: youtubeId,
          playerVars: {
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            fs: 0,
            playsinline: 1,
            mute: 1,
          },
          events: {
            onReady: () => {
              setPlayerReady(true);
              playerRef.current?.mute?.();
            },
            onStateChange: (event) => {
              if (event.data === 0) {
                setProgress(100);
                onCompleted();
              }
            },
          },
        });
      };

      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://www.youtube.com/iframe_api"]',
      );

      if ((window as Window & { YT?: YouTubePlayerApi }).YT?.Player) {
        initializePlayer();
      } else if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(script);
        (window as Window & { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady = () => {
          initializePlayer();
        };
      } else {
        (window as Window & { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady = () => {
          initializePlayer();
        };
      }

      return () => {
        playerRef.current?.destroy();
      };
    }, [playerId, youtubeId, onCompleted]);

    useEffect(() => {
      if (!youtubeId || !playerReady) return undefined;
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }
      progressTimerRef.current = window.setInterval(() => {
        const duration = playerRef.current?.getDuration?.() ?? 0;
        const current = playerRef.current?.getCurrentTime?.() ?? 0;
        if (duration > 0) {
          const nextProgress = Math.min(100, Math.max(0, (current / duration) * 100));
          setProgress(nextProgress);
        }
      }, 500);
      return () => {
        if (progressTimerRef.current) {
          window.clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
      };
    }, [youtubeId, playerReady]);

    const handlePlay = () => {
      if (youtubeId) {
        playerRef.current?.playVideo?.();
        return;
      }
      if (videoRef.current) {
        videoRef.current.muted = true;
      }
      videoRef.current?.play();
    };

    const handleTimeUpdate = () => {
      if (!videoRef.current) return;
      const duration = videoRef.current.duration || 0;
      if (duration <= 0) return;
      const current = videoRef.current.currentTime || 0;
      setProgress(Math.min(100, Math.max(0, (current / duration) * 100)));
    };

    return (
      <div className="rounded-lg border p-3 space-y-2 bg-card min-w-[260px]">
        <div className="font-medium text-sm">{dish.title}</div>
        <div className="text-xs text-muted-foreground">{dish.description}</div>
        <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted">
          {youtubeId ? (
            <div className="h-full w-full" id={playerId} />
          ) : (
            <video
              ref={videoRef}
              className="h-full w-full"
              src={resolveVideoUrl(dish.videoUrl)}
              controls={false}
              muted
              playsInline
              onEnded={() => {
                setProgress(100);
                onCompleted();
              }}
              onTimeUpdate={handleTimeUpdate}
              controlsList="nodownload noplaybackrate noremoteplayback"
              disablePictureInPicture
            />
          )}
        </div>
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(progress)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{completed ? "Vídeo assistido" : "Assista até o fim para liberar"}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{completed ? "Concluído" : "Bloqueado"}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={handlePlay}
            disabled={youtubeId ? !playerReady : false}
          >
            Reproduzir
          </Button>
        </div>
      </div>
    );
  };

  const StatusLine = ({ status }: { status: TrainingStatus }) => (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <StatusBadge status={status} />
      <span className="uppercase">{status.replace("_", " ")}</span>
    </div>
  );

  const handleDishCompleted = (trainingId: number, dishId: number) => {
    setCompletedDishesByTraining((prev) => {
      const existing = new Set(prev[trainingId] ?? []);
      existing.add(dishId);
      return { ...prev, [trainingId]: Array.from(existing) };
    });
  };

  const handleAssignDish = () => {
    if (!assignTrainingId || !assignDishId) {
      setAssignDishError("Selecione um treinamento e um prato.");
      return;
    }
    assignDishToTraining(assignTrainingId, assignDishId);
    setAssignDishError(null);
  };

  const handleAddEmployee = () => {
    const trimmed = newEmployeeName.trim();
    if (!trimmed) {
      setLocalError("Informe o nome do operador.");
      return;
    }
    addEmployee(trimmed);
    setNewEmployeeName("");
    setLocalError(null);
  };

  const handleAddDish = () => {
    const title = newDishTitle.trim();
    const description = newDishDescription.trim();
    const videoUrl = newDishVideoUrl.trim();
    if (!title || !description || !videoUrl) {
      setDishError("Preencha nome, descrição e link do vídeo.");
      return;
    }
    addDish(title, description, videoUrl);
    setNewDishTitle("");
    setNewDishDescription("");
    setNewDishVideoUrl("");
    setDishError(null);
  };

  const getTrainingsForOperator = (operatorId: number | null) => {
    if (!operatorId) return [];
    return trainings.filter((training) => training.assignedTo === operatorId);
  };

  const AdminOperatorView = () => {
    if (trainingsLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    if (trainingsError) {
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive space-y-3">
          <div>Erro ao carregar treinamentos.</div>
          <Button variant="outline" size="sm" onClick={reloadTrainings}>
            Tentar novamente
          </Button>
        </div>
      );
    }

    if (operators.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
          Nenhum operador disponível.
        </div>
      );
    }

    const operatorTrainings = getTrainingsForOperator(adminSelectedOperatorId);

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-muted-foreground">Selecione o operador</div>
          {adminSelectedOperatorId ? (
            <div className="flex items-center justify-between rounded-xl border px-3 py-2">
              <span className="text-sm font-semibold">
                {operators.find((employee) => employee.id === adminSelectedOperatorId)?.name ?? "Operador"}
              </span>
              <Button size="sm" variant="outline" onClick={() => setAdminSelectedOperatorId(null)}>
                Trocar
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {operators.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => setAdminSelectedOperatorId(employee.id)}
                  className="h-10 rounded-lg border px-3 text-left text-sm font-semibold transition-colors hover:border-primary/50"
                >
                  {employee.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {adminSelectedOperatorId && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Treinamentos atribuídos
            </h3>
            {operatorTrainings.length === 0 ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
                Nenhum treinamento disponível.
              </div>
            ) : (
              <div className="space-y-3">
                {operatorTrainings.map((training) => {
                  const completedDishes = completedDishesByTraining[training.id] ?? [];
                  const hasDishes = training.dishes.length > 0;
                  const canComplete = hasDishes && training.dishes.every((dishId) => completedDishes.includes(dishId));

                  return (
                    <div key={training.id} className="bg-card border rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{training.title}</div>
                        <StatusBadge status={training.status} />
                      </div>
                      <StatusLine status={training.status} />
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Pratos e vídeos
                        </div>
                        {training.dishes.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 text-sm text-muted-foreground">
                            Nenhum prato atribuído.
                          </div>
                        ) : (
                          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                            {training.dishes
                              .map((dishId) => dishesById.get(dishId))
                              .filter((dish) => dish !== undefined)
                              .map((dish) =>
                                dish ? (
                                  <DishVideo
                                    key={dish.id}
                                    trainingId={training.id}
                                    dish={dish}
                                    completed={completedDishes.includes(dish.id)}
                                    onCompleted={() => handleDishCompleted(training.id, dish.id)}
                                  />
                                ) : null,
                              )}
                          </div>
                        )}
                      </div>
                      {training.status !== "concluido" && hasDishes && (
                        <div className="space-y-1">
                          <Button
                            className="w-full"
                            onClick={() => {
                              if (!adminSelectedOperatorId) return;
                              markTrainingCompleted(adminSelectedOperatorId, training.id);
                            }}
                            disabled={!canComplete}
                          >
                            Concluir Treinamento
                          </Button>
                          {!canComplete && training.dishes.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Assista todos os vídeos para liberar a conclusão.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    );
  };

  const AdminManagerView = () => {
    if (trainingsLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <section className="space-y-2 rounded-lg border p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Criar operador
          </h3>
          <div className="flex gap-2">
            <Input
              placeholder="Nome do operador"
              value={newEmployeeName}
              onChange={(event) => setNewEmployeeName(event.target.value)}
            />
            <Button onClick={handleAddEmployee}>Adicionar</Button>
          </div>
          {localError && <div className="text-xs text-destructive">{localError}</div>}
        </section>

        <section className="space-y-2 rounded-lg border p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Cadastrar prato com vídeo
          </h3>
          <div className="space-y-2">
            <Input
              placeholder="Nome do prato"
              value={newDishTitle}
              onChange={(event) => setNewDishTitle(event.target.value)}
            />
            <Input
              placeholder="Descrição do prato"
              value={newDishDescription}
              onChange={(event) => setNewDishDescription(event.target.value)}
            />
            <Input
              placeholder="Link do vídeo (YouTube ou MP4)"
              value={newDishVideoUrl}
              onChange={(event) => setNewDishVideoUrl(event.target.value)}
            />
            <Button onClick={handleAddDish}>Adicionar prato</Button>
            {dishError && <div className="text-xs text-destructive">{dishError}</div>}
          </div>
        </section>

        <section className="space-y-2 rounded-lg border p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Vincular prato ao treinamento
          </h3>
          <div className="space-y-2">
            {trainings.length === 0 ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 text-sm text-muted-foreground">
                Nenhum treinamento disponível.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {trainings.map((training) => {
                  const isSelected = training.id === assignTrainingId;
                  return (
                    <button
                      key={training.id}
                      type="button"
                      onClick={() => setAssignTrainingId(training.id)}
                      className={`h-10 rounded-lg border px-3 text-left text-sm font-semibold transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:border-primary/50"
                      }`}
                    >
                      {training.title}
                    </button>
                  );
                })}
              </div>
            )}
            {dishes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 text-sm text-muted-foreground">
                Nenhum prato disponível para vincular.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {dishes.map((dish) => {
                  const isSelected = dish.id === assignDishId;
                  return (
                    <button
                      key={dish.id}
                      type="button"
                      onClick={() => setAssignDishId(dish.id)}
                      className={`h-10 rounded-lg border px-3 text-left text-sm font-semibold transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:border-primary/50"
                      }`}
                    >
                      {dish.title}
                    </button>
                  );
                })}
              </div>
            )}
            <Button onClick={handleAssignDish}>Vincular prato</Button>
            {assignDishError && <div className="text-xs text-destructive">{assignDishError}</div>}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Operadores e progresso
          </h3>
          {managerSelectedOperatorId ? (
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-sm font-semibold">
                {operators.find((employee) => employee.id === managerSelectedOperatorId)?.name ?? "Operador"}
              </span>
              <Button size="sm" variant="outline" onClick={() => setManagerSelectedOperatorId(null)}>
                Trocar
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {operators.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => setManagerSelectedOperatorId(employee.id)}
                  className="h-10 rounded-lg border px-3 text-left text-sm font-semibold transition-colors hover:border-primary/50"
                >
                  {employee.name}
                </button>
              ))}
            </div>
          )}
          {!managerSelectedOperatorId && (
            <div className="text-xs text-muted-foreground">
              Selecione um operador para ver os treinamentos.
            </div>
          )}
          {managerSelectedOperatorId && (
            <div className="space-y-3">
              {getTrainingsForOperator(managerSelectedOperatorId).length === 0 ? (
                <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 text-sm text-muted-foreground">
                  Nenhum treinamento disponível.
                </div>
              ) : (
                <div className="space-y-3">
                  {getTrainingsForOperator(managerSelectedOperatorId).map((training) => {
                    const completedDishes = completedDishesByTraining[training.id] ?? [];
                    return (
                      <div key={training.id} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{training.title}</span>
                          <StatusBadge status={training.status} />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Vídeo: {training.status === "concluido" ? "assistido" : "pendente"}
                        </div>
                        {training.dishes.length === 0 ? (
                          <div className="text-xs text-muted-foreground">Nenhum prato atribuído.</div>
                        ) : (
                          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                            {training.dishes
                              .map((dishId) => dishesById.get(dishId))
                              .filter((dish) => dish !== undefined)
                              .map((dish) =>
                                dish ? (
                                  <DishVideo
                                    key={dish.id}
                                    trainingId={training.id}
                                    dish={dish}
                                    completed={completedDishes.includes(dish.id)}
                                    onCompleted={() => handleDishCompleted(training.id, dish.id)}
                                  />
                                ) : null,
                              )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    );
  };

  const OperationalView = () => (
    <div className="space-y-6">
      {/* Status do Dia (Para Operador/Cozinha) */}
      <section className="bg-card rounded-xl p-4 border shadow-sm">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          Minhas Tarefas Hoje
        </h3>
        
        <div className="space-y-3">
           {/* Checklist Card - Action Oriented */}
           <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border-l-4 border-warning cursor-pointer hover:bg-muted transition-colors" onClick={() => navigate("/checklists")}>
             <div className="flex items-center gap-3">
               <div className="p-2 bg-background rounded-full">
                 <Clock className="w-4 h-4 text-warning" />
               </div>
               <div>
                 <p className="font-semibold text-sm">Checklist de Abertura</p>
                 <p className="text-xs text-muted-foreground">Pendente • Prazo: 10:00</p>
               </div>
             </div>
             <div className="px-3 py-1 bg-warning/10 text-warning text-xs font-bold rounded-full">
               FAZER
             </div>
           </div>

           {/* Training Card */}
           {stats.pendingTrainings > 0 && (
             <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border-l-4 border-info cursor-pointer hover:bg-muted transition-colors" onClick={() => navigate("/training")}>
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-background rounded-full">
                   <GraduationCap className="w-4 h-4 text-info" />
                 </div>
                 <div>
                   <p className="font-semibold text-sm">Novos Treinamentos</p>
                   <p className="text-xs text-muted-foreground">{stats.pendingTrainings} módulos pendentes</p>
                 </div>
               </div>
             </div>
           )}
        </div>
      </section>

      {/* Acesso Rápido Operacional */}
      <section className="grid grid-cols-2 gap-3">
        <ModuleCard
          title="Estoque"
          description="Consultar itens"
          icon={Package}
          to="/stock"
          variant="compact"
        />
         <ModuleCard
          title="Treinamentos"
          description="Minha trilha"
          icon={GraduationCap}
          to="/training"
          variant="compact"
        />
      </section>
    </div>
  );

  const ManagerView = () => (
    <div className="space-y-6">
       {/* Alert Stats */}
       <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Visão Geral da Loja
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Estoque Crítico"
              value={stats.criticalStock}
              icon={AlertTriangle}
              variant={stats.criticalStock > 0 ? "critical" : "success"}
              subtext="itens abaixo do mínimo"
              onClick={() => window.location.href='/stock'}
            />
            <StatCard
              label="Pedidos Pendentes"
              value={stats.pendingOrders}
              icon={ShoppingCart}
              variant={stats.pendingOrders > 3 ? "warning" : "default"}
              subtext="aguardando aprovação"
              onClick={() => window.location.href='/orders'}
            />
            <StatCard
              label="Checklists"
              value={stats.delayedChecklists}
              icon={ClipboardCheck}
              variant={stats.delayedChecklists > 0 ? "warning" : "success"}
              subtext={stats.delayedChecklists > 0 ? "atrasados hoje" : "em dia"}
              onClick={() => window.location.href='/checklists'}
            />
            <StatCard
              label="Treinamentos"
              value={stats.pendingTrainings}
              icon={GraduationCap}
              variant={stats.pendingTrainings > 2 ? "warning" : "default"}
              subtext="pendentes na equipe"
              onClick={() => window.location.href='/training'}
            />
          </div>
        </section>

        {/* Manager Modules */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Gestão
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModuleCard
              title="Estoque & Perdas"
              description="Controle de inventário e registro de quebras"
              icon={Package}
              to="/stock"
              badge={stats.criticalStock}
            />
            <ModuleCard
              title="Auditoria de Checklists"
              description="Revisar e aprovar checklists executados"
              icon={ClipboardCheck}
              to="/checklists/review"
              badge={stats.delayedChecklists}
            />
            <ModuleCard
              title="Pedidos de Compra"
              description="Aprovação e recebimento de mercadoria"
              icon={ShoppingCart}
              to="/orders"
              badge={stats.pendingOrders}
            />
             <ModuleCard
              title="Equipe & Acessos"
              description="Gerenciar usuários e permissões"
              icon={Users}
              to="/users"
            />
             {isAdmin && (
              <ModuleCard
                title="Configuração de Rede"
                description="Unidades, Produtos e Cardápios"
                icon={Building2}
                to="/units"
              />
            )}
          </div>
        </section>
    </div>
  );

  return (
    <AppLayout title="Codex">
      <div className="p-4 space-y-6 animate-fade-in pb-24">
        {canAccessDashboard && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Olá, {firstName}!</h2>
                <p className="text-muted-foreground text-sm flex items-center mt-1">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {new Date().toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                stats.criticalStock > 0 ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-success/10 text-success border-success/20'
              }`}>
                 {stats.criticalStock > 0 ? 'ATENÇÃO' : 'LOJA OK'}
              </div>
            </div>

            {isManager ? <ManagerView /> : <OperationalView />}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
