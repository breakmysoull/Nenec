import { useTrainings } from "@/contexts/TrainingsContext";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, ChevronDown, Lock, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { TrainingStepsChecklist } from "../components/TrainingStepsChecklist";
import { TrainingQuiz } from "../components/TrainingQuiz";
import YouTube, { YouTubeProps } from "react-youtube";

// Helper to extract YouTube ID from URL
const extractYouTubeId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? match[1] : null;
};

export const ReelsPlayer = () => {
  const { trainingId } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();
  const { trainings, dishes, updateVideoProgress, markTrainingCompleted } = useTrainings();

  const [lessons, setLessons] = useState<any[]>([]); // Adapting dishes to lessons format
  const [steps, setSteps] = useState<any[]>([]); // Steps will just be mock questions later
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Videos Progression Locked State
  const [videoProgress, setVideoProgress] = useState<Record<string, boolean>>({});
  
  const [quizMode, setQuizMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load from memory context instead of DB for this MVP environment
    if (!trainingId) return;

    const tId = parseInt(trainingId, 10);
    const training = trainings.find(t => t.id === tId);

    if (training) {
      // Map DishMock to the Lesson shape expected by ReelsPlayer
      const mappedLessons = training.dishes.map(dishId => {
        const dish = dishes.find(d => d.id === dishId);
        return {
          id: dishId.toString(),
          title: dish?.title || "Sem Título",
          video_url: dish?.videoUrl || "",
        };
      }).filter(l => l.video_url);

      setLessons(mappedLessons);

      // Create fake steps for the quiz based on the lessons
      setSteps(mappedLessons.map((l, i) => ({
         id: `step-${l.id}`,
         title: `Você aprendeu sobre o preparo de ${l.title} neste treinamento.`,
         required: true
      })));

      const initialStatus: Record<string, boolean> = {};
      mappedLessons.forEach(l => {
        initialStatus[l.id] = false; 
      });
      setVideoProgress(initialStatus);
    }
    
    setLoading(false);
  }, [trainingId, trainings, dishes]);

  const currentLesson = lessons[currentIndex];
  // Verify if current video is unlocked
  const isCurrentVideoFinished = currentLesson ? videoProgress[currentLesson.id] : false;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Disable native scroll if locked to avoid user bypassing
    const container = containerRef.current;
    if (!container) return;

    if (!isCurrentVideoFinished && !quizMode) {
      // Force scroll back to current video
      container.scrollTop = currentIndex * window.innerHeight;
    } else {
      // Calculate current item based on scroll position safely
      const position = Math.round(container.scrollTop / window.innerHeight);
      if (position !== currentIndex && position < lessons.length) {
        setCurrentIndex(position);
      } else if (position === lessons.length) {
        if (!quizMode) setQuizMode(true);
      }
    }
  };

  const handleVideoCompleted = (lessonId: string) => {
    setVideoProgress(prev => ({ ...prev, [lessonId]: true }));
    toast.success("Vídeo concluído! Você pode deslizar para o próximo.");
  };

  const slideNext = () => {
    if (!containerRef.current) return;
    const nextIndex = currentIndex + 1;
    containerRef.current.scrollTo({
      top: nextIndex * window.innerHeight,
      behavior: 'smooth'
    });
    
    if (nextIndex >= lessons.length) {
      setQuizMode(true);
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  const handleQuizSuccess = () => {
     if (!trainingId) return;
     
     const tId = parseInt(trainingId, 10);
     
     // Mark every video as 100% in context
     lessons.forEach(l => {
       updateVideoProgress(tId, parseInt(l.id, 10), 100);
     });
     
     markTrainingCompleted(1, tId); // hardcoded employeeId 1 for mock MVP
     toast.success("Parabéns! Você concluiu o treinamento.");
     navigate(-1);
  };

  if (loading) {
    return (
      <div className="bg-black text-white h-screen flex items-center justify-center">
        Carregando Reels...
      </div>
    );
  }

  if (lessons.length === 0) {
    return (
      <div className="bg-black text-white h-screen flex flex-col items-center justify-center space-y-4">
        <p>Nenhuma aula encontrada para este treinamento.</p>
        <Button onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black text-white overflow-hidden relative">
       {/* Top Bar Overlay */}
       <div className="absolute top-0 w-full z-50 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between safe-area-top">
         <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
         </Button>
         <div className="flex-1 text-center px-4">
            <h1 className="font-bold text-sm truncate">{quizMode ? "Quiz Final" : currentLesson?.title}</h1>
            <p className="text-xs text-white/70">
              {quizMode ? "Validação" : `${currentIndex + 1} de ${lessons.length}`}
            </p>
         </div>
         <div className="w-10" />
       </div>

       {/* Snap Container */}
       <div 
         ref={containerRef}
         className="h-full w-full overflow-y-auto snap-y snap-mandatory no-scrollbar scroll-smooth"
         onScroll={handleScroll}
         // Se o vídeo não acabou, bloqueamos toque para arrastar (overscroll behaviour fallback)
         style={(!isCurrentVideoFinished && !quizMode) ? { touchAction: 'none' } : {}}
       >
          {lessons.map((lesson, index) => (
             <div key={lesson.id} className="h-screen w-full snap-center relative flex items-center justify-center bg-black">
                {/* Simulated Player (since we rely on generic iframes, we will build a custom internal wrapper here) */}
                <ReelsVideoItem 
                  lesson={lesson} 
                  isActive={index === currentIndex && !quizMode} 
                  onCompleted={() => handleVideoCompleted(lesson.id)}
                  isFinished={videoProgress[lesson.id]}
                />
             </div>
          ))}

          {/* Final Item: Quiz */}
          <div className="h-screen w-full snap-center bg-zinc-950 relative flex flex-col pt-24 pb-12 px-6 overflow-y-auto">
             {quizMode && (
               <TrainingQuiz 
                  steps={steps} 
                  onSuccess={handleQuizSuccess} 
               />
             )}
          </div>
       </div>

       {/* Overlay Progress Locker (Right bottom) */}
       {!quizMode && (
         <div className="absolute bottom-8 left-0 w-full px-6 z-40 flex flex-col items-end safe-area-bottom pointer-events-none">
           <div className="flex flex-col gap-4 items-end pointer-events-auto">
             {!isCurrentVideoFinished ? (
               <div className="bg-black/80 backdrop-blur-md px-4 py-3 rounded-2xl flex items-center gap-3 border border-white/10 shadow-xl animate-fade-in">
                 <div className="relative flex items-center justify-center bg-primary/20 w-10 h-10 rounded-full">
                    <Lock className="w-5 h-5 text-primary" />
                 </div>
                 <div className="flex flex-col">
                   <span className="text-sm font-bold text-white leading-tight">Assista até o final</span>
                   <span className="text-xs text-white/60">para liberar a próxima aula</span>
                 </div>
               </div>
             ) : (
               <Button 
                 size="lg" 
                 className="rounded-full shadow-xl bg-primary hover:bg-primary/90 text-white gap-2 h-14 px-6 animate-bounce"
                 onClick={slideNext}
               >
                 <ArrowLeft className="w-5 h-5 -rotate-90" />
                 Mover para {currentIndex === lessons.length - 1 ? "o Quiz" : "o Próximo"}
               </Button>
             )}
           </div>
         </div>
       )}
    </div>
  );
};

// Internal Video Item Component 
const ReelsVideoItem = ({ lesson, isActive, onCompleted, isFinished }: { lesson: any, isActive: boolean, onCompleted: () => void, isFinished: boolean }) => {
  const [progress, setProgress] = useState(0);
  const [player, setPlayer] = useState<any>(null);
  const [duration, setDuration] = useState(0);

  const videoId = lesson.video_url ? extractYouTubeId(lesson.video_url) : null;
  
  useEffect(() => {
    let interval: number;
    if (isActive && !isFinished && player && duration > 0) {
      interval = window.setInterval(() => {
        const currentTime = player.getCurrentTime();
        const currentProgress = (currentTime / duration) * 100;
        setProgress(currentProgress);
        
        // Safety check if YouTube's onEnd event fails to trigger exactly at the end
        if (currentProgress >= 98 || currentTime >= duration - 1) {
           setProgress(100);
           onCompleted();
           clearInterval(interval);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isActive, isFinished, player, duration, onCompleted]);

  // Handle play/pause when sliding
  useEffect(() => {
    if (player) {
      if (isActive) {
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    }
  }, [isActive, player]);

  const onReady: YouTubeProps['onReady'] = (event) => {
     setPlayer(event.target);
     setDuration(event.target.getDuration());
     if (isActive) {
       event.target.playVideo();
     }
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    // 0 = ended
    if (event.data === 0) {
      setProgress(100);
      onCompleted();
    }
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: isActive ? 1 : 0,
      controls: 1, // Let user control but we track background
      rel: 0,
      modestbranding: 1,
      fs: 1, // Fullscreen button
      playsinline: 1,
    },
  };

  return (
    <div className="w-full h-full relative">
       {/* Background Blur for non-perfect ratios */}
       <div 
         className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30" 
         style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1555939594-58d7cb561ad1)' }} 
       />
       
       {videoId ? (
         <div className="w-full h-full absolute inset-0 pt-[80px] pb-[120px]">
           <YouTube 
             videoId={videoId} 
             opts={opts} 
             onReady={onReady} 
             onStateChange={onStateChange}
             className="w-full h-full flex items-center justify-center max-h-[80vh] mx-auto"
             iframeClassName="w-full h-full max-w-lg aspect-[9/16] object-contain rounded-2xl shadow-2xl mx-auto border border-white/10 bg-black"
           />
         </div>
       ) : lesson.video_url ? (
          // Fallback for non-youtube links (e.g., .mp4)
         <iframe
           src={lesson.video_url}
           className="w-full h-full object-cover pointer-events-none absolute inset-0"
           allow="autoplay"
         />
       ) : (
         <div className="w-full h-full absolute inset-0 flex items-center justify-center text-white/50 bg-zinc-900">
           <p>Nenhum vídeo anexado</p>
         </div>
       )}

       {/* Gradient Overlay for Text Readability */}
       <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
       
       <div className="absolute bottom-12 left-0 w-full px-4 pb-4 pointer-events-none z-10">
         <h2 className="text-xl font-bold mb-2 break-words max-w-[80%]">{lesson.title}</h2>
         <p className="text-sm text-white/80 line-clamp-2 max-w-[80%]">Assista atentamente as instruções da aula antes de avançar para a prova.</p>
       </div>
    </div>
  )
}
