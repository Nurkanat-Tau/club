import { redirect } from "next/navigation";

// Only Shymkent is open for now — skip the city picker.
export default function Home() {
  redirect("/shymkent");
}
