
import { useEffect, useMemo, useRef, useState } from "react";
import { DishMock, useTrainings, TrainingStatus } from "@/contexts/TrainingsContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  GraduationCap,
  RefreshCcw,
  UserPlus
} from "lucide-react";

export const MyTrainings = () => {
  const {
    employees,
    trainings,
    dishes,
    videoProgressByTraining,
    trainingsLoading,
    trainingsError,
    reloadTrainings,
    addEmployee,
    assignTraining,
    startTraining,
    addDish,
    updateDish,
    assignDishToTraining,
    updateVideoProgress,
    markTrainingCompleted,
  } = useTrainings();

  const [profileMode, setProfileMode] = useState<"operator" | "manager">("operator");
  const [selectedOperatorId, setSelectedOperatorId] = useState<number | null>(null);
  const [managerSelectedOperatorId, setManagerSelectedOperatorId] = useState<number | null>(null);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newTrainingTitle, setNewTrainingTitle] = useState("");
  const [assignEmployeeId, setAssignEmployeeId] = useState<number | null>(null);
  const [newDishTitle, setNewDishTitle] = useState("");
  const [newDishDescription, setNewDishDescription] = useState("");
  const [newDishVideoUrl, setNewDishVideoUrl] = useState("");
  const [assignTrainingId, setAssignTrainingId] = useState<number | null>(null);
  const [assignDishId, setAssignDishId] = useState<number | null>(null);
  const [startedDishesByTraining, setStartedDishesByTraining] = useState<Record<number, number[]>>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const [dishError, setDishError] = useState<string | null>(null);
  const [assignDishError, setAssignDishError] = useState<string | null>(null);
  const [editingDishId, setEditingDishId] = useState<number | null>(null);
  const [editDishTitle, setEditDishTitle] = useState("");
  const [editDishDescription, setEditDishDescription] = useState("");
  const [editDishVideoUrl, setEditDishVideoUrl] = useState("");
  const [editDishError, setEditDishError] = useState<string | null>(null);

  const operators = useMemo(
    () => employees.filter((employee) => employee.role === "OPERATOR"),
    [employees],
  );

  const effectiveOperatorId = selectedOperatorId ?? null;

  const operatorTrainings = useMemo(() => {
    if (!effectiveOperatorId) return [];
    return trainings.filter((training) => training.assignedTo === effectiveOperatorId);
  }, [trainings, effectiveOperatorId]);

  const dishesById = useMemo(() => new Map(dishes.map((dish) => [dish.id, dish])), [dishes]);

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

  const handleMarkCompleted = (trainingId: number) => {
    if (!effectiveOperatorId) return;
    markTrainingCompleted(effectiveOperatorId, trainingId);
  };

  const handleReload = async () => {
    setSelectedOperatorId(null);
    setManagerSelectedOperatorId(null);
    setStartedDishesByTraining({});
    await reloadTrainings();
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

  const handleAssignTraining = () => {
    const trimmed = newTrainingTitle.trim();
    if (!assignEmployeeId || !trimmed) {
      setLocalError("Selecione um operador e informe o treinamento.");
      return;
    }
    assignTraining(assignEmployeeId, trimmed);
    setNewTrainingTitle("");
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

  const handleAssignDish = () => {
    if (!assignTrainingId || !assignDishId) {
      setAssignDishError("Selecione um treinamento e um prato.");
      return;
    }
    assignDishToTraining(assignTrainingId, assignDishId);
    setAssignDishError(null);
  };

  const handleDishStart = (trainingId: number, dishId: number) => {
    setStartedDishesByTraining((prev) => {
      const existing = new Set(prev[trainingId] ?? []);
      existing.add(dishId);
      return { ...prev, [trainingId]: Array.from(existing) };
    });
    if (effectiveOperatorId) {
      startTraining(effectiveOperatorId, trainingId);
    }
  };

  const handleDishCompleted = (trainingId: number, dishId: number) => {
    updateVideoProgress(trainingId, dishId, 100);
  };

  const handleStartEditDish = (dish: DishMock) => {
    setEditingDishId(dish.id);
    setEditDishTitle(dish.title);
    setEditDishDescription(dish.description);
    setEditDishVideoUrl(dish.videoUrl);
    setEditDishError(null);
  };

  const handleCancelEditDish = () => {
    setEditingDishId(null);
    setEditDishTitle("");
    setEditDishDescription("");
    setEditDishVideoUrl("");
    setEditDishError(null);
  };

  const handleSaveDish = () => {
    if (!editingDishId) return;
    const title = editDishTitle.trim();
    const description = editDishDescription.trim();
    const videoUrl = editDishVideoUrl.trim();
    if (!title || !description || !videoUrl) {
      setEditDishError("Preencha nome, descrição e link do vídeo.");
      return;
    }
    updateDish(editingDishId, title, description, videoUrl);
    handleCancelEditDish();
  };

  type YouTubePlayerInstance = {
    playVideo: () => void;
    destroy: () => void;
    mute?: () => void;
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

  const DishVideo = ({
    trainingId,
    dish,
    onCompleted,
    completed,
    progress,
    started,
    onStart,
  }: {
    trainingId: number;
    dish: DishMock;
    onCompleted: () => void;
    completed: boolean;
    progress: number;
    started: boolean;
    onStart: () => void;
  }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const playerRef = useRef<YouTubePlayerInstance | null>(null);
    const [playerReady, setPlayerReady] = useState(false);
    const [autoPlayRequested, setAutoPlayRequested] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const autoPlayRequestedRef = useRef(false);
    const youtubeId = extractYouTubeId(dish.videoUrl);
    const playerId = `yt-player-${trainingId}-${dish.id}`;

    useEffect(() => {
      autoPlayRequestedRef.current = autoPlayRequested;
    }, [autoPlayRequested]);

    useEffect(() => {
      if (!youtubeId || !started || !isExpanded) return undefined;
      setPlayerReady(false);

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
              if (autoPlayRequestedRef.current) {
                playerRef.current?.playVideo();
                autoPlayRequestedRef.current = false;
                setAutoPlayRequested(false);
              }
            },
            onStateChange: (event) => {
              if (event.data === 0) {
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
    }, [playerId, youtubeId, onCompleted, started, isExpanded]);

    useEffect(() => {
      if (started && !isExpanded) {
        setIsExpanded(true);
      }
    }, [started, isExpanded]);

    useEffect(() => {
      if (!started || youtubeId || !autoPlayRequested) return;
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.play();
        setAutoPlayRequested(false);
      }
    }, [started, youtubeId, autoPlayRequested]);

    const handlePrimaryAction = () => {
      if (!started) {
        onStart();
        setIsExpanded(true);
        setAutoPlayRequested(true);
        return;
      }
      if (youtubeId) {
        playerRef.current?.playVideo();
        return;
      }
      if (videoRef.current) {
        videoRef.current.muted = true;
      }
      videoRef.current?.play();
    };

    return (
      <div className="rounded-lg border p-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="font-medium text-sm">{dish.title}</div>
            <div className="text-xs text-muted-foreground">{dish.description}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setIsExpanded((prev) => !prev)}>
            {isExpanded ? "Recolher" : "Detalhes"}
          </Button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {completed ? "Vídeo assistido" : started ? "Em andamento" : "Não iniciado"}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrimaryAction}
              disabled={started && youtubeId ? !playerReady : false}
            >
              {started ? "Reproduzir" : "Começar Treinamento"}
            </Button>
          </div>
        </div>
        {started && isExpanded && (
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
                onEnded={onCompleted}
                controlsList="nodownload noplaybackrate noremoteplayback"
                disablePictureInPicture
              />
            )}
          </div>
        )}
      </div>
    );
  };

  const StatusLine = ({ status }: { status: TrainingStatus }) => (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <StatusBadge status={status} />
      <span className="uppercase">{status.replace("_", " ")}</span>
    </div>
  );

  const operatorProfile = (() => {
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
        <div className="space-y-4">
          <EmptyState
            icon={GraduationCap}
            title="Nenhum operador disponível"
            description="Cadastre um operador para iniciar."
          />
          <Button variant="outline" className="w-full" onClick={handleReload}>
            Recarregar mocks
          </Button>
        </div>
      );
    }

    const completed = operatorTrainings.filter((t) => t.status === "concluido");
    const pending = operatorTrainings.filter((t) => t.status === "pendente");
    const inProgress = operatorTrainings.filter((t) => t.status === "em_andamento");

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-muted-foreground">Selecione o operador</div>
          {selectedOperatorId ? (
            <div className="flex items-center justify-between rounded-xl border px-3 py-2">
              <span className="text-sm font-semibold">
                {operators.find((employee) => employee.id === selectedOperatorId)?.name ?? "Operador"}
              </span>
              <Button size="sm" variant="outline" onClick={() => setSelectedOperatorId(null)}>
                Trocar
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {operators.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => setSelectedOperatorId(employee.id)}
                  className="h-10 rounded-lg border px-3 text-left text-sm font-semibold transition-colors hover:border-primary/50"
                >
                  {employee.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedOperatorId && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Treinamentos atribuídos
            </h3>
            {operatorTrainings.length === 0 ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
                Nenhum treinamento disponível.
              </div>
            ) : (
            <div className="space-y-2">
                {operatorTrainings.map((training) => {
                  const trainingProgress = videoProgressByTraining[training.id] ?? {};
                  const completedDishes = training.dishes.filter(
                    (dishId) => (trainingProgress[dishId] ?? 0) >= 100,
                  );
                  const hasDishes = training.dishes.length > 0;
                  const canComplete = hasDishes && training.dishes.length === completedDishes.length;
                  const progressValue = hasDishes
                    ? Math.round((completedDishes.length / training.dishes.length) * 100)
                    : 0;

                  return (
                  <div key={training.id} className="bg-card border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{training.title}</div>
                        <StatusBadge status={training.status} />
                      </div>
                      <StatusLine status={training.status} />
                      <div className="space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Pratos e vídeos
                        </div>
                        {hasDishes && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Progresso</span>
                              <span>
                                {completedDishes.length}/{training.dishes.length} · {progressValue}%
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full bg-primary transition-all"
                                style={{ width: `${progressValue}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {training.dishes.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 text-sm text-muted-foreground">
                            Nenhum prato atribuído.
                          </div>
                        ) : (
                        <div className="space-y-2">
                            {training.dishes
                              .map((dishId) => dishesById.get(dishId))
                              .filter((dish) => dish !== undefined)
                              .map((dish) =>
                                dish ? (
                                  <DishVideo
                                    key={dish.id}
                                    trainingId={training.id}
                                    dish={dish}
                                    completed={(trainingProgress[dish.id] ?? 0) >= 100}
                                    progress={trainingProgress[dish.id] ?? 0}
                                    started={(startedDishesByTraining[training.id] ?? []).includes(dish.id)}
                                    onStart={() => handleDishStart(training.id, dish.id)}
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
                            onClick={() => handleMarkCompleted(training.id)}
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

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Histórico de concluídos
          </h3>
          {completed.length === 0 ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
              Nenhum treinamento concluído ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {completed.map((training) => (
                <div key={training.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-sm">{training.title}</span>
                  <StatusBadge status={training.status} />
                </div>
              ))}
            </div>
          )}
          {(pending.length > 0 || inProgress.length > 0) && (
            <div className="text-xs text-muted-foreground">
              Pendentes: {pending.length} · Em andamento: {inProgress.length}
            </div>
          )}
        </section>
      </div>
    );
  })();

  const managerProfile = (() => {
    if (trainingsLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    if (employees.length === 0 || trainings.length === 0) {
      return (
        <div className="space-y-4">
          <EmptyState
            icon={GraduationCap}
            title="Dados simulados vazios"
            description="Recarregue os mocks para testar o fluxo."
          />
          <Button variant="outline" className="w-full" onClick={handleReload}>
            Recarregar mocks
          </Button>
        </div>
      );
    }

    const operatorsForAssign = operators.length > 0 ? operators : [];

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
            <Button onClick={handleAddEmployee}>
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
          {localError && (
            <div className="text-xs text-destructive">{localError}</div>
          )}
        </section>

        <section className="space-y-2 rounded-lg border p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Atribuir treinamento
          </h3>
          <div className="space-y-2">
            {operatorsForAssign.length === 0 ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 text-sm text-muted-foreground">
                Nenhum operador disponível para atribuição.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {operatorsForAssign.map((employee) => {
                  const isSelected = employee.id === assignEmployeeId;
                  return (
                    <button
                      key={employee.id}
                      type="button"
                      onClick={() => setAssignEmployeeId(employee.id)}
                      className={`h-10 rounded-lg border px-3 text-left text-sm font-semibold transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:border-primary/50"
                      }`}
                    >
                      {employee.name}
                    </button>
                  );
                })}
              </div>
            )}
            <Input
              placeholder="Título do treinamento"
              value={newTrainingTitle}
              onChange={(event) => setNewTrainingTitle(event.target.value)}
            />
            <Button onClick={handleAssignTraining}>Atribuir</Button>
            {localError && (
              <div className="text-xs text-destructive">{localError}</div>
            )}
          </div>
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
            {dishes.length === 0 && (
              <div className="text-xs text-muted-foreground">
                Nenhum prato cadastrado no momento.
              </div>
            )}
          </div>
        </section>

        <section className="space-y-2 rounded-lg border p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Editar pratos
          </h3>
          <div className="space-y-2">
            {dishes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 text-sm text-muted-foreground">
                Nenhum prato disponível para edição.
              </div>
            ) : (
              <div className="space-y-2">
                {dishes.map((dish) => (
                  <div key={dish.id} className="rounded-lg border px-2 py-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{dish.title}</div>
                      <Button size="sm" variant="outline" onClick={() => handleStartEditDish(dish)}>
                        Editar
                      </Button>
                    </div>
                    {editingDishId === dish.id && (
                      <div className="space-y-2">
                        <Input
                          placeholder="Nome do prato"
                          value={editDishTitle}
                          onChange={(event) => setEditDishTitle(event.target.value)}
                        />
                        <Input
                          placeholder="Descrição do prato"
                          value={editDishDescription}
                          onChange={(event) => setEditDishDescription(event.target.value)}
                        />
                        <Input
                          placeholder="Link do vídeo (YouTube ou MP4)"
                          value={editDishVideoUrl}
                          onChange={(event) => setEditDishVideoUrl(event.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveDish}>
                            Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEditDish}>
                            Cancelar
                          </Button>
                        </div>
                        {editDishError && <div className="text-xs text-destructive">{editDishError}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
          {managerSelectedOperatorId &&
            operators
              .filter((employee) => employee.id === managerSelectedOperatorId)
              .map((employee) => {
            const employeeTrainings = trainings.filter((training) => training.assignedTo === employee.id);
            const completedCount = employeeTrainings.filter((training) => training.status === "concluido").length;
            const totalCount = employeeTrainings.length;
            const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            return (
              <div key={employee.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{employee.name}</div>
                  <div className="text-xs text-muted-foreground">{progress}% concluído</div>
                </div>
                {employeeTrainings.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Sem treinamentos atribuídos.</div>
                ) : (
                  <div className="space-y-2">
                    {employeeTrainings.map((training) => (
                      <div key={training.id} className="rounded-lg border px-2 py-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{training.title}</span>
                          <StatusBadge status={training.status} />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Vídeo: {training.status === "concluido" ? "assistido" : "pendente"}
                        </div>
                        {training.dishes.length === 0 ? (
                          <div className="text-xs text-muted-foreground">Nenhum prato atribuído.</div>
                        ) : (
                          <div className="space-y-2">
                            {training.dishes
                              .map((dishId) => dishesById.get(dishId))
                              .filter((dish) => dish !== undefined)
                              .map((dish) => (
                                <div key={dish?.id} className="rounded-md border px-2 py-1.5">
                                  <div className="text-xs font-medium">{dish?.title}</div>
                                  <div className="text-xs text-muted-foreground">{dish?.description}</div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>
    );
  })();

  return (
    <AppLayout title="Treinamento">
      <PageHeader 
        title="Treinamento" 
        subtitle="Ambiente de testes com dados simulados"
      />

      <div className="p-4 space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={profileMode === "operator" ? "default" : "outline"}
            onClick={() => setProfileMode("operator")}
          >
            Operador
          </Button>
          <Button
            variant={profileMode === "manager" ? "default" : "outline"}
            onClick={() => setProfileMode("manager")}
          >
            Gestor
          </Button>
          <Button variant="outline" onClick={handleReload}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Recarregar
          </Button>
        </div>

        {profileMode === "operator" ? operatorProfile : managerProfile}
      </div>
    </AppLayout>
  );
};
