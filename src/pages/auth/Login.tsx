import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { Loader2, ChefHat } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

      // Detect CPF or Email
      let loginIdentifier = email;
      const cleanCpf = email.replace(/\D/g, "");
      const isCpf = cleanCpf.length === 11 && /^\d+$/.test(cleanCpf);
      
      if (isCpf) {
        loginIdentifier = `${cleanCpf}@codex.internal`;
      }

      try {
        await signInWithEmailAndPassword(auth, loginIdentifier, password);
        toast.success("Login realizado com sucesso!");
        navigate("/dashboard");
      } catch (err: any) {
        toast.error("Erro ao inciar sessão. Verifique suas credenciais.", {
          description: err.message,
        });
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
              <Label htmlFor="email">CPF ou E-mail</Label>
              <Input
                id="email"
                type="text"
                placeholder="000.000.000-00 ou seu@email.com"
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
            <span className="text-muted-foreground">Fale com o administrador para obter acesso.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
