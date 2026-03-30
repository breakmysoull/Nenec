import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, Maximize, Minimize, Volume2, VolumeX, Play, Pause, CheckCircle } from "lucide-react";
import { TrainingQuiz } from "../components/TrainingQuiz";
import YouTube, { YouTubeProps } from "react-youtube";
import { useAuth } from "@/contexts/AuthContext";
import { trainingService } from "../services/trainingService";
import { TrainingLesson, LessonQuestion } from "../types";

const extractYouTubeId = (url: string) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? match[1] : null;
};

export const ReelsPlayer = () => {
  const { trainingId } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lessons, setLessons] = useState<TrainingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Controle Central de Visualização
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoProgress, setVideoProgress] = useState<Record<string, boolean>>({});
  const [quizMode, setQuizMode] = useState(false);
  
  // Estado para Mudo
  const [isMuted, setIsMuted] = useState(false);

  // Intersection Ref Array
  const observer = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const loadContent = async () => {
      if (!trainingId || !user) return;
      try {
        const data = await trainingService.getTrainingById(trainingId, user.id);
        const validLessons = data.lessons.filter(l => l.video_url);
        
        // Sorting if order_index exists
        validLessons.sort((a,b) => (a.order_index || 0) - (b.order_index || 0));
        
        setLessons(validLessons);

        const initialStatus: Record<string, boolean> = {};
        validLessons.forEach(l => {
          // You could sync this from UserTrainingProgress in real life
          initialStatus[l.id] = false; 
        });
        setVideoProgress(initialStatus);
        
      } catch (error) {
        console.error("Erro:", error);
        toast.error("Erro ao carregar o conteúdo do treinamento");
      } finally {
        setLoading(false);
      }
    };
    loadContent();
  }, [trainingId, user]);

  useEffect(() => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = elementsRef.current.findIndex(el => el === entry.target);
          if (index !== -1 && index !== currentIndex && !quizMode) {
            setCurrentIndex(index);
          }
        }
      });
    }, {
      root: null,
      threshold: 0.7 // Trigger autoplay at 70% visibility 
    });

    elementsRef.current.forEach(el => {
      if (el) observer.current?.observe(el);
    });

    return () => observer.current?.disconnect();
  }, [lessons.length, currentIndex, quizMode]);

  const slideNext = () => {
    if (currentIndex >= lessons.length - 1) {
       setQuizMode(true);
    } else {
       elementsRef.current[currentIndex + 1]?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLessonCompleted = (lessonId: string) => {
     setVideoProgress(prev => {
        if (prev[lessonId]) return prev;
        return { ...prev, [lessonId]: true };
     });
  };

  const currentLesson = lessons[currentIndex];
  // O vídeo atual pode seguir pro próximo?
  const isCurrentFinished = currentLesson ? videoProgress[currentLesson.id] : false;

  const handleQuizSuccess = async () => {
     if (!trainingId || !user) return;
     try {
       await trainingService.requestTrainingApproval(trainingId, user.id);
       toast.success("Parabéns! Você concluiu o treinamento.");
       navigate(-1);
     } catch (error) {
       toast.error("Erro ao salvar progresso.");
     }
  };

  if (loading) {
    return <div className="bg-black text-white h-[100dvh] flex items-center justify-center font-bold">Carregando conteúdos...</div>;
  }

  if (lessons.length === 0) {
    return (
      <div className="bg-black text-white h-[100dvh] flex flex-col items-center justify-center p-6 text-center space-y-4">
         <h2 className="text-xl font-bold">Nenhum vídeo</h2>
         <p className="text-white/60">Este treinamento não possui conteúdo em vídeo cadastrado.</p>
         <Button variant="outline" className="text-black" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-black text-white overflow-hidden relative">
       {/* HEADERS */}
       <div className="absolute top-0 w-full z-50 p-4 bg-gradient-to-b from-black/90 to-transparent flex items-center justify-between pointer-events-none">
         <div className="pointer-events-auto">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-6 h-6" />
            </Button>
         </div>
         <div className="flex-1 text-center px-4">
            <h1 className="font-bold text-sm truncate">{quizMode ? "Quiz Final" : currentLesson?.title}</h1>
            <p className="text-xs text-white/50">{quizMode ? "Validação" : `${currentIndex + 1} de ${lessons.length}`}</p>
         </div>
         <div className="pointer-events-auto">
            <Button variant="ghost" size="icon" className="text-white" onClick={() => setIsMuted(!isMuted)}>
               {isMuted ? <VolumeX className="w-5 h-5"/> : <Volume2 className="w-5 h-5"/>}
            </Button>
         </div>
       </div>

       {/* SCROLL SNAP CONTAINER */}
       <div 
         className="h-full w-full overflow-y-auto snap-y snap-mandatory scroll-smooth no-scrollbar"
         style={(!isCurrentFinished && !quizMode) ? { overflowY: 'hidden' } : {}} // Trava Scroll nativo se não acabou
       >
          {lessons.map((lesson, index) => {
             // Virtualização / Lazy Loading (+- 1 render)
             const isVirtualVisible = Math.abs(index - currentIndex) <= 1;
             
             return (
               <div 
                 key={lesson.id} 
                 ref={el => { elementsRef.current[index] = el; }}
                 className="h-[100dvh] w-full snap-start snap-always relative flex items-center justify-center bg-black"
               >
                 {isVirtualVisible ? (
                   <ReelsVideoItem 
                     lesson={lesson} 
                     isActive={index === currentIndex && !quizMode} 
                     isMuted={isMuted}
                     isFinished={!!videoProgress[lesson.id]}
                     onCompleted={() => handleLessonCompleted(lesson.id)}
                   />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"/></div>
                 )}
               </div>
             );
          })}

          {/* O Quiz final sempre no fundo */}
          <div className="h-[100dvh] w-full snap-start snap-always relative bg-zinc-950 flex flex-col pt-24 pb-12 px-6 overflow-y-auto">
             {quizMode && (
               <TrainingQuiz 
                  steps={lessons.map(l => ({ 
                    id: l.id, 
                    training_id: trainingId!,
                    description: `Revisão final: ${l.title}`, 
                    required: true,
                    order_index: 0,
                    created_at: new Date().toISOString()
                  }))} 
                  onSuccess={handleQuizSuccess} 
               />
             )}
          </div>
       </div>

       {/* BOTÃO FLUTUANTE DE PRÓXIMO: Quando liberado e não está em Quiz Interno (Tratado no Item) */}
       {!quizMode && isCurrentFinished && (
         <div className="absolute bottom-8 right-6 z-40 animate-fade-in pointer-events-auto">
             <Button 
               size="lg" 
               className="rounded-full shadow-2xl bg-primary hover:bg-primary/90 text-white gap-2 h-14 px-6 animate-bounce"
               onClick={slideNext}
             >
               <ArrowLeft className="w-5 h-5 -rotate-90" />
               {currentIndex === lessons.length - 1 ? "Ir para o Quiz" : "Próximo"}
             </Button>
         </div>
       )}
    </div>
  );
};

/* ========================================================================= */
/* COMPONENTE INTERNO DE ITEM DE VÍDEO (REELS TIKTOK STYLE)                  */
/* ========================================================================= */
const ReelsVideoItem = ({ 
  lesson, 
  isActive, 
  isMuted,
  isFinished,
  onCompleted
}: { 
  lesson: TrainingLesson, 
  isActive: boolean, 
  isMuted: boolean,
  isFinished: boolean,
  onCompleted: () => void 
}) => {
  const [player, setPlayer] = useState<any>(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Status Interno de Quiz de Vídeo
  const [quizOnScreen, setQuizOnScreen] = useState(false);
  const [quizScore, setQuizScore] = useState<number[]>([]); // Guarda respostas
  
  const videoId = extractYouTubeId(lesson.video_url || "");
  const hasQuestions = lesson.questions && lesson.questions.length > 0;

  // Sync mute/play
  useEffect(() => {
    if (player && typeof player.setVolume === 'function') {
      isMuted ? player.mute?.() : player.unMute?.();
    }
  }, [isMuted, player]);

  // Controle de Pausa/Play automático ou por Fullscreen Loss
  useEffect(() => {
    if (player && typeof player.playVideo === 'function') {
       if (isActive && !quizOnScreen) {
         player.playVideo();
         setIsPlaying(true);
       } else {
         player.pauseVideo();
         setIsPlaying(false);
       }
    }
    
    // Reset Fullscreen local on inactive
    if (!isActive) setIsFullscreen(false);
  }, [isActive, quizOnScreen, player]);

  // Checagem de 80%
  useEffect(() => {
    let interval: number;
    if (isActive && !isFinished && !quizOnScreen && player && duration > 0) {
      interval = window.setInterval(() => {
         try {
           const current = player.getCurrentTime();
           if (current / duration >= 0.8) {
              if (hasQuestions) {
                 player.pauseVideo();
                 setIsPlaying(false);
                 setQuizOnScreen(true);
              } else {
                 onCompleted();
              }
              clearInterval(interval);
           }
         } catch(e) {}
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, isFinished, quizOnScreen, player, duration, onCompleted, hasQuestions]);

  const onReady: YouTubeProps['onReady'] = (e) => {
     setPlayer(e.target);
     setDuration(e.target.getDuration());
     if (isMuted) e.target.mute();
     if (isActive && !quizOnScreen) {
       e.target.playVideo();
       setIsPlaying(true);
     }
  };

  const onStateChange: YouTubeProps['onStateChange'] = (e) => {
     setIsPlaying(e.data === 1);
     // 0 = concluído (se falhou o 80% observer por pulo)
     if (e.data === 0) {
        if (hasQuestions && !isFinished) {
           setQuizOnScreen(true);
        } else {
           onCompleted();
        }
     }
  };

  const togglePlayPause = () => {
    if (!player) return;
    if (isPlaying) player.pauseVideo();
    else player.playVideo();
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: isActive ? 1 : 0,
      controls: 0, // Tiramos controles para gerenciar Tap e Overlay nativo customizado
      rel: 0,
      modestbranding: 1,
      fs: 0, 
      playsinline: 1,
      iv_load_policy: 3
    },
  };

  const handleFullscreenToggle = () => {
     setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`relative flex items-center justify-center bg-black transition-all duration-300 ease-out ${isFullscreen ? 'fixed inset-0 z-[100] w-screen h-screen' : 'w-full h-full'}`}>
        
        {/* Background Blur Helper pra preencher formato Vertical num vídeo widescreen */}
        {videoId && !isFullscreen && (
          <div 
            className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 pointer-events-none" 
            style={{ backgroundImage: `url(https://img.youtube.com/vi/${videoId}/hqdefault.jpg)` }} 
          />
        )}

        <div className={`w-full absolute inset-0 flex items-center justify-center transition-all ${isFullscreen ? 'h-full bg-black' : 'h-[80%] my-auto'}`}>
           {videoId ? (
             <YouTube 
               videoId={videoId} 
               opts={opts} 
               onReady={onReady} 
               onStateChange={onStateChange}
               className={`w-full flex items-center justify-center pointer-events-none ${isFullscreen ? 'h-full max-w-none' : 'h-[80vh] max-w-lg'}`}
               iframeClassName={`w-full object-contain mx-auto shadow-2xl bg-black ${isFullscreen ? 'h-full aspect-auto' : 'h-full aspect-[9/16] rounded-2xl border border-white/10'}`}
             />
           ) : lesson.video_url ? (
             <video
               src={lesson.video_url}
               autoPlay={isActive && !quizOnScreen}
               loop={false}
               muted={isMuted}
               controls={false}
               onTimeUpdate={(e) => {
                 const current = e.currentTarget.currentTime;
                 const dur = e.currentTarget.duration;
                 if (!isFinished && !quizOnScreen && (current / dur >= 0.8)) {
                    if (hasQuestions) {
                       e.currentTarget.pause();
                       setQuizOnScreen(true);
                    } else {
                       onCompleted();
                    }
                 }
               }}
               className={`w-full object-contain pointer-events-none bg-black mx-auto ${isFullscreen ? 'h-full max-w-none aspect-auto' : 'h-full max-w-lg aspect-[9/16] rounded-2xl border border-white/10'}`}
             />
           ) : <div className="text-white/30 text-center font-semibold">Sem arquivo de vídeo</div>}
        </div>

        {/* CONTROLES OVERLAY DA TELA DE VÍDEO (TAP PLAY E FULLSCREEN) */}
        {!quizOnScreen && (
            <div 
               className="absolute inset-0 z-10" 
               onClick={togglePlayPause} 
            >
               {/* Ícone Play se Pausado no meio da tela */}
               {!isPlaying && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in zoom-in-50 duration-200">
                    <div className="bg-black/50 backdrop-blur rounded-full w-20 h-20 flex items-center justify-center border border-white/20">
                      <Play className="w-10 h-10 text-white fill-white ml-2" />
                    </div>
                 </div>
               )}

               {/* Botão Fullscreen isolado embaixo */}
               <div className="absolute bottom-6 right-4 z-20">
                 <Button variant="ghost" size="icon" className="bg-black/40 text-white rounded-full backdrop-blur hover:bg-black/60 pointer-events-auto" onClick={(e) => { e.stopPropagation(); handleFullscreenToggle(); }}>
                    {isFullscreen ? <Minimize className="w-5 h-5"/> : <Maximize className="w-5 h-5"/>}
                 </Button>
               </div>
            </div>
        )}

        {/* INTERFACE DE QUIZ DO VÍDEO */}
        {quizOnScreen && lesson.questions && (
            <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center px-4 animate-in fade-in duration-300">
               <div className="w-full max-w-md space-y-6">
                 <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/30">
                       <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-white leading-tight">Checagem de Aprendizado</h3>
                    <p className="text-sm text-white/70">Responda corretamente para liberar o próximo vídeo.</p>
                 </div>
                 
                 <div className="space-y-6 mt-6">
                    {lesson.questions.map((q, qIndex) => (
                       <div key={q.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4 space-y-3">
                         <p className="font-semibold text-sm">{(qIndex + 1)}. {q.text}</p>
                         <div className="space-y-2">
                            {q.options.map((opt, oIdx) => (
                               <button 
                                 key={oIdx}
                                 onClick={() => {
                                    const newScore = [...quizScore];
                                    newScore[qIndex] = oIdx;
                                    setQuizScore(newScore);
                                 }}
                                 className={`w-full text-left px-3 py-2.5 rounded-lg text-sm border transition-colors ${quizScore[qIndex] === oIdx ? 'bg-primary/20 border-primary text-primary-foreground font-medium' : 'bg-black/50 border-white/10 text-white/80 hover:bg-white/5'}`}
                               >
                                  {opt}
                               </button>
                            ))}
                         </div>
                       </div>
                    ))}
                 </div>

                 <Button 
                   className="w-full h-12 text-md font-bold"
                   disabled={quizScore.length !== lesson.questions.length || quizScore.includes(undefined as any)}
                   onClick={() => {
                      let passed = true;
                      lesson.questions?.forEach((q, idx) => {
                         if (quizScore[idx] !== q.correctAnswerIndex) passed = false;
                      });
                      if (passed) {
                         toast.success("Respostas corretas!");
                         setQuizOnScreen(false);
                         onCompleted();
                      } else {
                         toast.error("Ops! Alguma resposta está errada. Tente novamente.");
                      }
                   }}
                 >
                   Verificar Respostas
                 </Button>
               </div>
            </div>
        )}

        {/* PROGRESS INFOS OVERLAY */}
         <div className="absolute bottom-6 left-4 w-2/3 pointer-events-none z-10">
           <h2 className="text-lg font-bold mb-1 leading-tight text-shadow">{lesson.title}</h2>
           {!isFinished && !quizOnScreen && (
             <div className="flex items-center gap-2 mt-2 bg-black/60 backdrop-blur w-fit px-3 py-1.5 rounded-full border border-white/10">
               <Lock className="w-3 h-3 text-primary" />
               <span className="text-[10px] font-medium text-white/90">Veja 80% do vídeo para liberar</span>
             </div>
           )}
           {isFinished && !quizOnScreen && (
             <div className="flex items-center gap-2 mt-2 bg-green-500/20 backdrop-blur w-fit px-3 py-1.5 rounded-full border border-green-500/30">
               <CheckCircle className="w-3 h-3 text-green-400" />
               <span className="text-[10px] font-medium text-green-400">Aula concluída!</span>
             </div>
           )}
         </div>
    </div>
  )
}
