import { useNavigate } from "react-router-dom";
import { GraduationCap, Award, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";

const TraineeDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { roles } = usePermissions();

  const userName =
    (roles && roles[0] ? (roles[0] as any)?.profiles?.full_name : null) ||
    user?.email?.split("@")[0] ||
    "Funcionário";

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Header top bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-card border-b flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">Portal de Treinamentos</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
          <LogOut className="w-4 h-4 mr-1" />
          Sair
        </Button>
      </div>

      <div className="mt-14 w-full max-w-sm space-y-8 text-center">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
            <span className="text-3xl font-bold text-primary">
              {userName.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Olá,</p>
            <h1 className="text-2xl font-bold capitalize">{userName}</h1>
            <span className="inline-block mt-1 text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
              Funcionário em Treinamento
            </span>
          </div>
        </div>

        {/* Call to action */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <Award className="w-7 h-7 text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="font-semibold text-lg">Seus Treinamentos</h2>
            <p className="text-muted-foreground text-sm">
              Assista aos vídeos e complete a prova de validação para finalizar seu treinamento.
            </p>
          </div>
          <Button
            size="lg"
            className="w-full"
            onClick={() => navigate("/training")}
          >
            <GraduationCap className="w-5 h-5 mr-2" />
            Acessar Treinamentos
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Em caso de dúvidas, fale com seu gerente.
        </p>
      </div>
    </div>
  );
};

export default TraineeDashboard;
