/** Categories a new club can pick. Emoji and color are derived so every club looks consistent. */
export const CATEGORIES = [
  { id: "running", label: "Бег / ходьба", emoji: "🏃", color: "#E0662B" },
  { id: "english", label: "Языки / разговорный клуб", emoji: "🗣️", color: "#2F6FDE" },
  { id: "chess", label: "Шахматы / настолки", emoji: "♟️", color: "#1F8A78" },
  { id: "racket", label: "Теннис / бадминтон", emoji: "🏓", color: "#C8407A" },
  { id: "outdoor", label: "Походы / природа", emoji: "⛰️", color: "#5E9A2E" },
  { id: "ball", label: "Футбол / волейбол / баскетбол", emoji: "⚽", color: "#0E7490" },
  { id: "fitness", label: "Фитнес / йога", emoji: "🧘", color: "#7C3AED" },
  { id: "books", label: "Книги / дискуссии", emoji: "📚", color: "#B45309" },
  { id: "creative", label: "Музыка / фото / творчество", emoji: "🎸", color: "#DB2777" },
  { id: "tech", label: "IT / бизнес / нетворкинг", emoji: "💡", color: "#4F46E5" },
  { id: "games", label: "Игры / киберспорт", emoji: "🎮", color: "#9333EA" },
  { id: "other", label: "Другое", emoji: "✨", color: "#EA580C" },
] as const;

export const getCategory = (id: string) => CATEGORIES.find((c) => c.id === id) ?? null;
