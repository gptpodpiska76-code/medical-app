import { supabase } from "./supabase";

export async function fetchDoctors() {
  const { data, error } = await supabase
    .from("doctors")
    .select("id, full_name, specialty, bio, active")
    .eq("active", true)
    .order("specialty", { ascending: true })
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchMyAppointments() {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("appointments")
    .select("id, date, time, reason, status, doctor_id, doctors(full_name, specialty)")
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((a) => ({
    id: a.id,
    date: a.date,
    time: String(a.time).slice(0, 5),
    title: a.reason || "Wizyta",
    specialty: a.doctors?.specialty ?? "",
    doctorId: a.doctor_id,
    doctorName: a.doctors?.full_name ?? "",
    status:
      a.status === "PENDING" ? "Oczekuje" :
      a.status === "CONFIRMED" ? "Potwierdzona" :
      a.status === "CANCELLED" ? "Anulowana" : "Zrealizowana",
  }));
}

export async function createAppointment({ doctor_id, date, time, reason }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error("Nie jesteś zalogowany");

  const { error } = await supabase.from("appointments").insert({
    patient_id: userId,
    doctor_id,
    date,
    time,      // "10:00"
    reason,
    status: "PENDING",
  });

  if (error) throw error;
}

export async function cancelMyAppointment(id) {
  const { error } = await supabase
    .from("appointments")
    .update({ status: "CANCELLED" })
    .eq("id", id);

  if (error) throw error;
}
