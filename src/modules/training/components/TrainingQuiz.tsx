import { useState } from "react";
import { TrainingStep } from "../types";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ChevronRight, PartyPopper, RefreshCcw, XCircle } from "lucide-react";
import { toast } from "sonner";

interface TrainingQuizProps {
  steps: TrainingStep[];
  onSuccess: () => void;
}

export const TrainingQuiz = ({ steps, onSuccess }: TrainingQuizProps) => {
  // Mocking Quiz Questions based on Checklist Items (steps)
  // In a real app we would have a specific Quiz table, but since we are adapting:
  const questions = steps.map((step, index) => ({
    id: step.id,
    question: `A afirmação a seguir sobre o treinamento é verdadeira ou falsa? \n\n"${step.title}"`,
    options: [
      { id: 't', label: "Verdadeiro (Correto)" },
      { id: 'f', label: "Falso (Incorreto)" }
    ],
    correctAnswer: 't' // Mock assuming all checklist steps are true statements for now
  }));

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswer = (val: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
  };

  const handleNext = () => {
    if (!answers[currentQuestion.id]) {
      toast.error("Por favor, selecione uma resposta.");
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    let corrects = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) corrects++;
    });
    
    const calculatedScore = (corrects / questions.length) * 100;
    setScore(calculatedScore);
    setIsFinished(true);
  };

  const retryQuiz = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setIsFinished(false);
    setScore(0);
  };

  if (isFinished) {
    const passed = score >= 70; // 70% approval rate
    
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fade-in text-center px-4">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center ${passed ? 'bg-success/20' : 'bg-destructive/20'}`}>
          {passed ? <PartyPopper className="w-16 h-16 text-success" /> : <XCircle className="w-16 h-16 text-destructive" />}
        </div>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">{passed ? 'Aprovado!' : 'Reprovado'}</h2>
          <p className="text-white/60">Sua nota final foi de:</p>
          <p className={`text-5xl font-black ${passed ? 'text-success' : 'text-destructive'}`}>
            {score.toFixed(0)}%
          </p>
        </div>

        <div className="w-full max-w-sm space-y-4 mt-8">
           {passed ? (
             <Button size="lg" className="w-full h-14 text-lg bg-success hover:bg-success/90" onClick={onSuccess}>
                <CheckCircle2 className="mr-2" /> Finalizar Treinamento
             </Button>
           ) : (
             <Button size="lg" className="w-full h-14 text-lg" variant="outline" onClick={retryQuiz}>
                <RefreshCcw className="mr-2" /> Tentar Novamente
             </Button>
           )}
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
     toast.info("Treinamento não possui validações.");
     onSuccess(); // Bypass
     return null;
  }

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto">
       <div className="mb-8">
         <h2 className="text-xl font-bold flex items-center gap-2">
           <CheckCircle2 className="text-primary w-6 h-6" />
           Prova de Validação
         </h2>
         <p className="text-sm text-white/60 mt-1">Pergunta {currentQuestionIndex + 1} de {questions.length}</p>
         
         {/* Simple Progress bar */}
         <div className="w-full h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden">
           <div 
             className="h-full bg-primary transition-all duration-300" 
             style={{ width: `${(currentQuestionIndex / questions.length) * 100}%` }} 
           />
         </div>
       </div>

       <div className="flex-1 space-y-6">
         <div className="bg-zinc-900 rounded-2xl p-6 border border-white/5 shadow-xl">
           <p className="text-lg leading-relaxed">{currentQuestion.question}</p>
         </div>

         <RadioGroup 
           value={answers[currentQuestion.id] || ""} 
           onValueChange={handleAnswer}
           className="space-y-3"
         >
           {currentQuestion.options.map(opt => (
             <div key={opt.id}>
               <RadioGroupItem value={opt.id} id={opt.id} className="peer sr-only" />
               <Label
                 htmlFor={opt.id}
                 className="flex flex-col rounded-xl border-2 border-white/10 bg-zinc-900 p-4 hover:bg-white/5 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/20 transition-all"
               >
                 <span className="font-medium text-lg">{opt.label}</span>
               </Label>
             </div>
           ))}
         </RadioGroup>
       </div>

       <div className="mt-auto pt-6">
         <Button 
           size="lg" 
           className="w-full h-14 text-lg" 
           onClick={handleNext}
           disabled={!answers[currentQuestion.id]}
         >
           {currentQuestionIndex === questions.length - 1 ? "Finalizar Prova" : "Próxima Pergunta"}
           <ChevronRight className="ml-2 w-5 h-5" />
         </Button>
       </div>
    </div>
  )
}
