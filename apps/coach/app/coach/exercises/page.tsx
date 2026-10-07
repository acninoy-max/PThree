import { redirect } from "next/navigation";

// „Übungen" heißt jetzt „Training" und hat zwei Reiter. Alte Lesezeichen
// sollen trotzdem ankommen.
export default function ExercisesPage() {
  redirect("/coach/training");
}
