import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { signIn, signOut, signUp } from "./lib/auth";
import {
  fetchDoctors,
  fetchMyAppointments,
  createAppointment,
  cancelMyAppointment,
} from "./lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  CalendarDays,
  ClipboardList,
  UserRound,
  Bell,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";

/**
 * Supabase-connected UI
 * - Auth: sign up / sign in
 * - Doctors from DB
 * - Appointments from DB
 */

const STATUS_UI = {
  PENDING: "Oczekuje",
  CONFIRMED: "Potwierdzona",
  CANCELLED: "Anulowana",
  DONE: "Zrealizowana",
};

const UI_TO_DB_STATUS = {
  Oczekuje: "PENDING",
  Potwierdzona: "CONFIRMED",
  Anulowana: "CANCELLED",
  Zrealizowana: "DONE",
};

function fmtDate(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function hours() {
  const hs = [];
  for (let h = 8; h <= 18; h++) hs.push(h);
  return hs;
}

function makeId(prefix = "a") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function Topbar({ session, onSignOut, onOpenNotifications, unread }) {
  return (
    <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white grid place-items-center shadow">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold leading-tight">
              System rejestracji wizyt
            </div>
            <div className="text-xs text-slate-500 leading-tight">
              Supabase • Pacjent
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {session ? (
            <>
              <Button
                variant="outline"
                className="gap-2"
                onClick={onOpenNotifications}
              >
                <Bell className="h-4 w-4" />
                Powiadomienia
                {unread > 0 ? (
                  <Badge className="ml-1" variant="secondary">
                    {unread}
                  </Badge>
                ) : null}
              </Button>
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border bg-white">
                <span className="text-sm text-slate-600">Zalogowany:</span>
                <span className="text-sm font-medium">
                  {session.email || session.name}
                </span>
                <Badge variant="outline" className="ml-1">
                  pacjent
                </Badge>
              </div>
              <Button variant="ghost" onClick={onSignOut}>
                Wyloguj
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="flex gap-3">
      <div className="h-10 w-10 rounded-2xl border bg-white grid place-items-center shadow-sm">
        {icon}
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-slate-600">{desc}</div>
      </div>
    </div>
  );
}

function AuthScreen() {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  return (
    <Shell>
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Wejdź do systemu</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Logowanie</TabsTrigger>
                <TabsTrigger value="register">Rejestracja</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-5">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="np. jan@demo.pl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Hasło</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>

                  <Button
                    className="w-full gap-2"
                    disabled={loading}
                    onClick={async () => {
                      try {
                        setErr("");
                        setLoading(true);
                        await signIn({ email, password });
                      } catch (e) {
                        setErr(e?.message || "Błąd logowania");
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    <UserRound className="h-4 w-4" />
                    {loading ? "Logowanie..." : "Zaloguj"}
                  </Button>

                  {err ? (
                    <div className="text-sm text-red-600">{err}</div>
                  ) : null}

                  <div className="text-xs text-slate-500">
                    Jeśli w Supabase masz włączone potwierdzenie e-mail, po
                    rejestracji sprawdź skrzynkę.
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="register" className="mt-5">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Imię i nazwisko</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="np. Jan Kowalski"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Telefon</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="np. +48 123 456 789"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="np. jan@demo.pl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Hasło</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>

                  <Button
                    className="w-full"
                    disabled={loading}
                    onClick={async () => {
                      try {
                        setErr("");
                        setLoading(true);
                        await signUp({
                          email,
                          password,
                          fullName: name,
                          phone,
                        });
                      } catch (e) {
                        setErr(e?.message || "Błąd rejestracji");
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    {loading ? "Tworzę konto..." : "Utwórz konto pacjenta"}
                  </Button>

                  {err ? (
                    <div className="text-sm text-red-600">{err}</div>
                  ) : null}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Co potrafi system</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Feature
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Supabase Auth + RLS"
              desc="Dane pacjenta i wizyty są zabezpieczone politykami."
            />
            <Feature
              icon={<CalendarDays className="h-4 w-4" />}
              title="Kalendarz wizyt"
              desc="Widok dzienny i tygodniowy."
            />
            <Feature
              icon={<Plus className="h-4 w-4" />}
              title="Rejestracja wizyty"
              desc="Specjalizacja → lekarz → termin → zapis do bazy."
            />
            <Separator />
            <div className="text-sm text-slate-600">
              Następny etap: panel lekarza/admina + potwierdzanie wizyt + wolne
              sloty godzin.
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function Stat({ label, value, hint }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-4">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
        {hint ? (
          <div className="text-xs text-slate-500 mt-1">{hint}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AppointmentCard({ appt, onCancel, showActions }) {
  const statusVariant =
    appt.status === STATUS_UI.CONFIRMED
      ? "default"
      : appt.status === STATUS_UI.PENDING
      ? "secondary"
      : appt.status === STATUS_UI.CANCELLED
      ? "destructive"
      : "outline";

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium">{appt.title}</div>
            <div className="text-sm text-slate-600 mt-1">
              {appt.date} • {appt.time}
            </div>
            <div className="text-sm text-slate-600">
              {appt.specialty} • {appt.doctorName}
            </div>
          </div>
          <Badge variant={statusVariant}>{appt.status}</Badge>
        </div>

        {showActions ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onCancel(appt.id)}
              disabled={appt.status === STATUS_UI.CANCELLED}
            >
              Anuluj
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function BookingDialog({ doctors, onCreate }) {
  const specialties = useMemo(() => {
    const uniq = Array.from(
      new Set((doctors ?? []).map((d) => d.specialty).filter(Boolean))
    );
    return uniq.length ? uniq : ["Brak specjalizacji"];
  }, [doctors]);

  const [specialty, setSpecialty] = useState(specialties[0]);
  const doctorsForSpec = useMemo(
    () => (doctors ?? []).filter((d) => d.specialty === specialty),
    [doctors, specialty]
  );

  const [doctorId, setDoctorId] = useState(doctorsForSpec[0]?.id || "");
  const [date, setDate] = useState(fmtDate(new Date()));
  const [time, setTime] = useState("10:00");
  const [reason, setReason] = useState("Konsultacja");

  // обновляем селекты когда врачи загрузились/изменились
  useEffect(() => {
    if (!specialties.includes(specialty)) {
      setSpecialty(specialties[0]);
    }
  }, [specialties, specialty]);

  useEffect(() => {
    const first = (doctors ?? []).find((d) => d.specialty === specialty);
    setDoctorId(first?.id || "");
  }, [doctors, specialty]);

  const chosenDoctor = useMemo(() => {
    return (doctors ?? []).find((d) => d.id === doctorId) || null;
  }, [doctors, doctorId]);

  const canCreate = Boolean(chosenDoctor?.id) && Boolean(date) && Boolean(time);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Umów wizytę
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Rejestracja wizyty</DialogTitle>
        </DialogHeader>

        {!doctors?.length ? (
          <div className="text-sm text-slate-600">
            Brak lekarzy w bazie. Dodaj rekordy do tabeli <b>doctors</b> w
            Supabase.
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Specjalizacja</Label>
                <Select
                  value={specialty}
                  onValueChange={(v) => setSpecialty(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Lekarz</Label>
                <Select value={doctorId} onValueChange={setDoctorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz lekarza" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctorsForSpec.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label>Godzina</Label>
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "08:00",
                      "09:00",
                      "10:00",
                      "11:00",
                      "12:00",
                      "13:00",
                      "14:00",
                      "15:00",
                      "16:00",
                      "17:00",
                      "18:00",
                    ].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label>Powód wizyty</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="np. konsultacja, badanie"
                />
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-600">
                <div className="font-medium text-slate-900">Podsumowanie</div>
                <div>{reason}</div>
                <div>
                  {date} • {time}
                </div>
                <div>
                  {specialty} • {chosenDoctor?.full_name || "-"}
                </div>
              </div>

              <Button
                disabled={!canCreate}
                onClick={() =>
                  onCreate({
                    id: makeId("appt"),
                    title: reason,
                    date,
                    time,
                    specialty,
                    doctorId: chosenDoctor.id,
                    doctorName: chosenDoctor.full_name,
                    status: STATUS_UI.PENDING,
                  })
                }
              >
                Zarejestruj
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CalendarView({ mode, setMode, date, setDate, appointments }) {
  const d = useMemo(() => new Date(date + "T00:00:00"), [date]);

  const apptsForDay = (dayStr) =>
    appointments
      .filter((a) => a.date === dayStr)
      .filter((a) => a.status !== STATUS_UI.CANCELLED);

  const renderDaily = () => {
    const dayStr = fmtDate(d);
    const dayAppts = apptsForDay(dayStr);

    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Widok dzienny: {dayStr}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDate(fmtDate(addDays(d, -1)))}
              >
                ←
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDate(fmtDate(new Date()))}
              >
                Dziś
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDate(fmtDate(addDays(d, 1)))}
              >
                →
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="grid gap-2">
            {hours().map((h) => {
              const slot = String(h).padStart(2, "0") + ":00";
              const inSlot = dayAppts.filter((a) => a.time === slot);
              return (
                <div key={slot} className="flex gap-3 items-stretch">
                  <div className="w-14 text-xs text-slate-500 pt-2">{slot}</div>
                  <div className="flex-1 rounded-xl border bg-white p-2">
                    {inSlot.length ? (
                      <div className="grid gap-2">
                        {inSlot.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="text-sm font-medium">
                                {a.title}
                              </div>
                              <div className="text-xs text-slate-600">
                                {a.doctorName} • {a.specialty}
                              </div>
                            </div>
                            <Badge
                              variant={
                                a.status === STATUS_UI.CONFIRMED
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {a.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">Brak wizyt</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderWeekly = () => {
    const start = startOfWeek(d);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const labels = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Widok tygodniowy
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDate(fmtDate(addDays(d, -7)))}
              >
                ←
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDate(fmtDate(new Date()))}
              >
                Ten tydzień
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDate(fmtDate(addDays(d, 7)))}
              >
                →
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
            {days.map((day, idx) => {
              const dayStr = fmtDate(day);
              const items = apptsForDay(dayStr).sort((a, b) =>
                a.time.localeCompare(b.time)
              );

              return (
                <div key={dayStr} className="rounded-2xl border bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{labels[idx]}</div>
                    <div className="text-xs text-slate-500">{dayStr}</div>
                  </div>
                  <Separator className="my-2" />
                  <div className="grid gap-2">
                    {items.length ? (
                      items.map((a) => (
                        <div key={a.id} className="rounded-xl border p-2">
                          <div className="text-xs text-slate-500">{a.time}</div>
                          <div className="text-sm font-medium">{a.title}</div>
                          <div className="text-xs text-slate-600">
                            {a.doctorName}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400">Brak</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={mode === "day" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("day")}
          >
            Dzień
          </Button>
          <Button
            variant={mode === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("week")}
          >
            Tydzień
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-slate-600">Data</Label>
          <Input
            className="w-40"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      {mode === "day" ? renderDaily() : renderWeekly()}
    </div>
  );
}

function PatientDashboard({
  doctors,
  appointments,
  onCreate,
  onCancel,
  calendarProps,
  reload,
}) {
  const upcoming = useMemo(
    () =>
      appointments
        .filter((a) => a.status !== STATUS_UI.CANCELLED)
        .sort((a, b) =>
          (a.date + a.time).localeCompare(b.date + b.time)
        ),
    [appointments]
  );

  const [q, setQ] = useState("");

  const filteredDoctors = useMemo(() => {
    if (!q) return doctors;
    const s = q.toLowerCase();
    return doctors.filter(
      (d) =>
        d.full_name.toLowerCase().includes(s) ||
        d.specialty.toLowerCase().includes(s)
    );
  }, [doctors, q]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Panel pacjenta</div>
          <div className="text-sm text-slate-600">
            Umów wizytę i zarządzaj swoimi terminami.
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reload}>
            Odśwież
          </Button>
          <BookingDialog doctors={doctors} onCreate={onCreate} />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat
          label="Wizyty nadchodzące"
          value={upcoming.filter((a) => a.status !== STATUS_UI.DONE).length}
        />
        <Stat
          label="Potwierdzone"
          value={upcoming.filter((a) => a.status === STATUS_UI.CONFIRMED).length}
        />
        <Stat
          label="Oczekujące"
          value={upcoming.filter((a) => a.status === STATUS_UI.PENDING).length}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Twoje wizyty</div>
            <Badge variant="outline">{upcoming.length}</Badge>
          </div>

          <div className="grid gap-3">
            {upcoming.length ? (
              upcoming.map((a) => (
                <AppointmentCard
                  key={a.id}
                  appt={a}
                  onCancel={onCancel}
                  showActions
                />
              ))
            ) : (
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-6 text-sm text-slate-600">
                  Brak wizyt. Umów pierwszą wizytę.
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <CalendarView
          {...calendarProps}
          appointments={appointments}
        />
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lekarze</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                className="pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Szukaj (nazwisko lub specjalizacja...)"
              />
            </div>
            <Badge variant="outline">{filteredDoctors.length}</Badge>
          </div>

          {!filteredDoctors.length ? (
            <div className="text-sm text-slate-600">Brak wyników.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {filteredDoctors.map((d) => (
                <div
                  key={d.id}
                  className="rounded-2xl border bg-white p-3"
                >
                  <div className="font-medium">{d.full_name}</div>
                  <div className="text-sm text-slate-600">{d.specialty}</div>
                  {d.bio ? (
                    <div className="text-xs text-slate-500 mt-2">{d.bio}</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);

  const [calendarMode, setCalendarMode] = useState("week");
  const [calendarDate, setCalendarDate] = useState(fmtDate(new Date()));

  const [doctorsDb, setDoctorsDb] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [notifications, setNotifications] = useState(() => [
    {
      id: "n1",
      title: "Witamy w systemie",
      body: "Zaloguj się i umów wizytę. Dane zapisują się w Supabase.",
      at: new Date().toLocaleString(),
      read: false,
    },
  ]);

  const [showNotif, setShowNotif] = useState(false);

  const unread = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const pushNotif = (title, body) => {
    setNotifications((prev) => [
      {
        id: makeId("n"),
        title,
        body,
        at: new Date().toLocaleString(),
        read: false,
      },
      ...prev,
    ]);
  };

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  // Session from Supabase
  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const s = data.session;
      if (s?.user) {
        setSession({
          id: s.user.id,
          email: s.user.email,
          name: s.user.email,
          role: "pacjent",
        });
      } else {
        setSession(null);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s?.user) {
        setSession({
          id: s.user.id,
          email: s.user.email,
          name: s.user.email,
          role: "pacjent",
        });
      } else {
        setSession(null);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load doctors once
  useEffect(() => {
    fetchDoctors()
      .then(setDoctorsDb)
      .catch((e) => {
        console.error(e);
        pushNotif("Błąd", "Nie udało się pobrać listy lekarzy.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadAppointments = async () => {
    if (!session) return;
    try {
      const appts = await fetchMyAppointments();
      setAppointments(appts);
    } catch (e) {
      console.error(e);
      pushNotif("Błąd", "Nie udało się pobrać wizyt.");
    }
  };

  // Load my appointments after login
  useEffect(() => {
    if (!session) return;
    reloadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const onCreate = async (appt) => {
    try {
      await createAppointment({
        doctor_id: appt.doctorId,
        date: appt.date,
        time: appt.time, // "10:00"
        reason: appt.title,
      });

      pushNotif(
        "Wizyta zarejestrowana",
        `Twoja wizyta (${appt.date} ${appt.time}) ma status: Oczekuje.`
      );
      await reloadAppointments();
    } catch (e) {
      console.error(e);
      // Если занято уникальным ограничением (doctor_id + date + time)
      pushNotif(
        "Błąd",
        e?.message ||
          "Nie udało się utworzyć wizyty (termin może być zajęty)."
      );
    }
  };

  const onCancel = async (id) => {
    try {
      await cancelMyAppointment(id);
      pushNotif("Wizyta anulowana", "Twoja wizyta została anulowana.");
      await reloadAppointments();
    } catch (e) {
      console.error(e);
      pushNotif("Błąd", e?.message || "Nie udało się anulować wizyty.");
    }
  };

  const calendarProps = {
    mode: calendarMode,
    setMode: setCalendarMode,
    date: calendarDate,
    setDate: setCalendarDate,
  };

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <Topbar
        session={session}
        onSignOut={async () => {
          await signOut();
          setSession(null);
        }}
        onOpenNotifications={() => setShowNotif(true)}
        unread={unread}
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Badge variant="secondary" className="gap-1">
            <UserRound className="h-3.5 w-3.5" />
            Tryb: pacjent
          </Badge>
          <Badge variant="outline">Supabase</Badge>
          <Badge variant="outline">RLS</Badge>
        </div>

        <PatientDashboard
          doctors={doctorsDb}
          appointments={appointments}
          onCreate={onCreate}
          onCancel={onCancel}
          calendarProps={calendarProps}
          reload={reloadAppointments}
        />

        <div className="mt-10 text-xs text-slate-500">
          Wersja Supabase • Następny etap: panel lekarza/admina + wolne sloty +
          potwierdzanie wizyt.
        </div>
      </div>

      {/* Notifications modal */}
      {showNotif ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowNotif(false)}
          />
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-xl">
              <Card className="rounded-2xl shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Powiadomienia</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNotif(false)}
                    >
                      Zamknij
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      Statusy wizyt i komunikaty systemowe.
                    </div>
                    <Button size="sm" variant="outline" onClick={markAllRead}>
                      Oznacz wszystkie jako przeczytane
                    </Button>
                  </div>
                  <Separator className="my-3" />
                  <div className="grid gap-2 max-h-[50vh] overflow-auto pr-1">
                    {notifications.length ? (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`rounded-2xl border p-3 ${
                            n.read ? "bg-white" : "bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-medium">
                                {n.title}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {n.at}
                              </div>
                              <div className="text-sm text-slate-700 mt-2">
                                {n.body}
                              </div>
                            </div>
                            {!n.read ? (
                              <Badge variant="secondary">Nowe</Badge>
                            ) : (
                              <Badge variant="outline">OK</Badge>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-500">
                        Brak powiadomień.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
