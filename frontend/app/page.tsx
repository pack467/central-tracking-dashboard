import { redirect } from "next/navigation";
import { paths } from "@/app/lib/routes";
export default function Home() { redirect(paths.dashboard); }
