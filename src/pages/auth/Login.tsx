import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signIn, checkConnection } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, ChefHat } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login: Iniciando processo de login...");
    setLoading(true);

    try {
      // Verificar conexão antes de tentar login
      const isConnected = await checkConnection();
      if (!isConnected) {
        console.error("Login: Falha na verificação de conexão com Supabase");
        toast.error("Erro de conexão com o servidor. Verifique sua internet.");
        setLoading(false);
        return;
      }

      console.log("Login: Chamando signIn...");
      const { data, error } = await signIn(email, password);
      console.log("Login: signIn retornou", { data, error });

      if (error) {
        console.error("Login: Erro no signIn", error);
        toast.error("Erro ao fazer login", {
          description: error.message,
        });
        setLoading(false);
        return;
      }

      if (data.session) {
        console.log("Login: Sessão criada com sucesso. Navegando para dashboard...");
        toast.success("Login realizado com sucesso!");
        // Force navigation
        navigate("/dashboard");
      } else {
        console.warn("Login: Sucesso mas sem sessão (verifique confirmação de email).");
        toast.error("Erro ao iniciar sessão. Verifique seu e-mail.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Login: Exceção não tratada", err);
      toast.error("Ocorreu um erro inesperado ao fazer login.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-scale-in">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary flex items-center justify-center">
            <ChefHat className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">Codex</CardTitle>
            <CardDescription>
              Plataforma Operacional para Redes de Restaurantes
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Não tem uma conta? </span>
            <Link to="/register" className="text-primary font-medium hover:underline">
              Criar conta
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
