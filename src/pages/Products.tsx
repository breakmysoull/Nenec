import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Utensils, Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

// Mock data
const mockProducts = [
  { 
    id: 1, 
    name: "Hambúrguer Classic", 
    sku: "HAM-001",
    price: 24.90,
    ingredientCount: 8,
    hasRecipe: true 
  },
  { 
    id: 2, 
    name: "Hambúrguer Double Bacon", 
    sku: "HAM-002",
    price: 34.90,
    ingredientCount: 12,
    hasRecipe: true 
  },
  { 
    id: 3, 
    name: "Batata Frita Grande", 
    sku: "ACO-001",
    price: 14.90,
    ingredientCount: 3,
    hasRecipe: true 
  },
  { 
    id: 4, 
    name: "Milk Shake Chocolate", 
    sku: "BEB-001",
    price: 16.90,
    ingredientCount: 4,
    hasRecipe: false 
  },
];

const Products = () => {
  const [search, setSearch] = useState("");

  const filteredProducts = mockProducts.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.sku.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <AppLayout title="Produtos">
      <PageHeader
        title="Produtos"
        subtitle="Fichas técnicas e receitas"
        showBack
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Novo
          </Button>
        }
      />

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Products List */}
        {filteredProducts.length === 0 ? (
          <EmptyState
            icon={Utensils}
            title="Nenhum produto encontrado"
            description="Tente buscar por outro termo"
          />
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <div key={product.id} className="list-item cursor-pointer group">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{product.name}</span>
                    {!product.hasRecipe && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-warning/15 text-warning">
                        Sem receita
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {product.sku} • {product.ingredientCount} ingredientes
                  </p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <p className="font-semibold">{formatCurrency(product.price)}</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Products;
