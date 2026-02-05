import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type EmployeeRole = "OPERATOR" | "MANAGER" | "ADMIN";
export type TrainingStatus = "em_andamento" | "concluido" | "pendente";

export type EmployeeMock = {
  id: number;
  name: string;
  role: EmployeeRole;
};

export type TrainingMock = {
  id: number;
  title: string;
  assignedTo: number;
  status: TrainingStatus;
  dishes: number[];
};

export type DishMock = {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
};

interface TrainingsContextType {
  employees: EmployeeMock[];
  trainings: TrainingMock[];
  dishes: DishMock[];
  videoProgressByTraining: Record<number, Record<number, number>>;
  trainingsLoading: boolean;
  trainingsError: Error | null;
  reloadTrainings: () => Promise<void>;
  addEmployee: (name: string) => void;
  assignTraining: (employeeId: number, trainingTitle: string) => void;
  startTraining: (employeeId: number, trainingId: number) => void;
  updateTrainingStatus: (trainingId: number, status: TrainingStatus) => void;
  addDish: (title: string, description: string, videoUrl: string) => void;
  updateDish: (dishId: number, title: string, description: string, videoUrl: string) => void;
  assignDishToTraining: (trainingId: number, dishId: number) => void;
  updateVideoProgress: (trainingId: number, dishId: number, progress: number) => void;
  markTrainingCompleted: (employeeId: number, trainingId: number) => void;
}

const initialEmployeesMock: EmployeeMock[] = [
  { id: 1, name: "Ana Souza", role: "OPERATOR" },
  { id: 2, name: "Bruno Lima", role: "OPERATOR" },
  { id: 3, name: "Carla Menezes", role: "MANAGER" },
  { id: 4, name: "Diego Pereira", role: "ADMIN" },
];

const initialTrainingsMock: TrainingMock[] = [
  { id: 1, title: "Treinamento de pratos", assignedTo: 1, status: "pendente", dishes: [1, 2] },
  { id: 2, title: "Operação de Caixa", assignedTo: 1, status: "em_andamento", dishes: [] },
  { id: 3, title: "Segurança Alimentar", assignedTo: 2, status: "concluido", dishes: [3] },
  { id: 4, title: "Atendimento ao Cliente", assignedTo: 2, status: "pendente", dishes: [2] },
];

const initialDishesMock: DishMock[] = [
  {
    id: 1,
    title: "Lasanha da Casa",
    description: "Montagem, tempo de forno e padrão de finalização.",
    videoUrl: "https://youtube.com/shorts/457y_D7M06c?feature=share",
  },
  {
    id: 2,
    title: "Salada Caesar",
    description: "Cortes, montagem e molho final.",
    videoUrl: "https://www.youtube.com/shorts/a_M0MFywg-s",
  },
  {
    id: 3,
    title: "Sopa do Dia",
    description: "Base, ajuste de tempero e apresentação.",
    videoUrl: "https://www.youtube.com/shorts/a_M0MFywg-s",
  },
];

const TrainingsContext = createContext<TrainingsContextType>({
  employees: [],
  trainings: [],
  dishes: [],
  videoProgressByTraining: {},
  trainingsLoading: false,
  trainingsError: null,
  reloadTrainings: async () => {},
  addEmployee: () => {},
  assignTraining: () => {},
  startTraining: () => {},
  updateTrainingStatus: () => {},
  addDish: () => {},
  updateDish: () => {},
  assignDishToTraining: () => {},
  updateVideoProgress: () => {},
  markTrainingCompleted: () => {},
});

export const useTrainings = () => {
  const context = useContext(TrainingsContext);
  if (!context) {
    throw new Error("useTrainings must be used within a TrainingsProvider");
  }
  return context;
};

export const TrainingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<EmployeeMock[]>([]);
  const [trainings, setTrainings] = useState<TrainingMock[]>([]);
  const [dishes, setDishes] = useState<DishMock[]>([]);
  const [videoProgressByTraining, setVideoProgressByTraining] = useState<
    Record<number, Record<number, number>>
  >({});
  const [trainingsLoading, setTrainingsLoading] = useState(false);
  const [trainingsError, setTrainingsError] = useState<Error | null>(null);

  const loadTrainings = useCallback(async () => {
    setTrainingsLoading(true);
    setTrainingsError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setEmployees(initialEmployeesMock);
      setTrainings(initialTrainingsMock);
      setDishes(initialDishesMock);
      setVideoProgressByTraining({});
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Erro ao carregar treinamentos");
      setEmployees([]);
      setTrainings([]);
      setDishes([]);
      setTrainingsError(err);
    } finally {
      setTrainingsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrainings();
  }, [loadTrainings]);

  const addEmployee = useCallback((name: string) => {
    setEmployees((prev) => {
      const nextId = prev.length > 0 ? Math.max(...prev.map((e) => e.id)) + 1 : 1;
      return [...prev, { id: nextId, name, role: "OPERATOR" }];
    });
  }, []);

  const assignTraining = useCallback((employeeId: number, trainingTitle: string) => {
    setTrainings((prev) => {
      const nextId = prev.length > 0 ? Math.max(...prev.map((t) => t.id)) + 1 : 1;
      return [
        ...prev,
        {
          id: nextId,
          title: trainingTitle,
          assignedTo: employeeId,
          status: "pendente",
          dishes: [],
        },
      ];
    });
  }, []);

  const startTraining = useCallback((employeeId: number, trainingId: number) => {
    setTrainings((prev) =>
      prev.map((training) => {
        if (training.id !== trainingId) return training;
        if (training.assignedTo !== employeeId) return training;
        if (training.status === "concluido") return training;
        if (training.status === "em_andamento") return training;
        return { ...training, status: "em_andamento" };
      }),
    );
  }, []);

  const updateTrainingStatus = useCallback((trainingId: number, status: TrainingStatus) => {
    setTrainings((prev) =>
      prev.map((training) => (training.id === trainingId ? { ...training, status } : training)),
    );
  }, []);

  const addDish = useCallback((title: string, description: string, videoUrl: string) => {
    setDishes((prev) => {
      const nextId = prev.length > 0 ? Math.max(...prev.map((dish) => dish.id)) + 1 : 1;
      return [...prev, { id: nextId, title, description, videoUrl }];
    });
  }, []);

  const updateDish = useCallback((dishId: number, title: string, description: string, videoUrl: string) => {
    setDishes((prev) =>
      prev.map((dish) => (dish.id === dishId ? { ...dish, title, description, videoUrl } : dish)),
    );
  }, []);

  const assignDishToTraining = useCallback((trainingId: number, dishId: number) => {
    setTrainings((prev) =>
      prev.map((training) => {
        if (training.id !== trainingId) return training;
        if (training.dishes.includes(dishId)) return training;
        return { ...training, dishes: [...training.dishes, dishId] };
      }),
    );
  }, []);

  const updateVideoProgress = useCallback((trainingId: number, dishId: number, progress: number) => {
    setVideoProgressByTraining((prev) => {
      const trainingProgress = prev[trainingId] ?? {};
      const currentProgress = trainingProgress[dishId] ?? 0;
      const nextProgress = Math.min(100, Math.max(currentProgress, progress));
      return {
        ...prev,
        [trainingId]: { ...trainingProgress, [dishId]: nextProgress },
      };
    });
    setTrainings((prev) =>
      prev.map((training) => {
        if (training.id !== trainingId) return training;
        if (training.status !== "pendente") return training;
        return { ...training, status: "em_andamento" };
      }),
    );
  }, []);

  const markTrainingCompleted = useCallback((employeeId: number, trainingId: number) => {
    setTrainings((prev) =>
      prev.map((training) => {
        if (training.id !== trainingId) return training;
        if (training.assignedTo !== employeeId) return training;
        return { ...training, status: "concluido" };
      }),
    );
  }, []);

  return (
    <TrainingsContext.Provider
      value={{
        employees,
        trainings,
        dishes,
        videoProgressByTraining,
        trainingsLoading,
        trainingsError,
        reloadTrainings: loadTrainings,
        addEmployee,
        assignTraining,
        startTraining,
        updateTrainingStatus,
        addDish,
        updateDish,
        assignDishToTraining,
        updateVideoProgress,
        markTrainingCompleted,
      }}
    >
      {children}
    </TrainingsContext.Provider>
  );
};
