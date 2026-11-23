import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Car, ChevronDown, Plus, Search, LogOut, CheckCircle2, Wrench, AlertCircle } from 'lucide-react';
import {
  siAudi,
  siBmw,
  siCitroen,
  siDacia,
  siDsautomobiles,
  siFiat,
  siFord,
  siHonda,
  siHyundai,
  siJeep,
  siKia,
  siMazda,
  siMini,
  siMitsubishi,
  siNissan,
  siOpel,
  siPeugeot,
  siPorsche,
  siRenault,
  siSeat,
  siSkoda,
  siSubaru,
  siSuzuki,
  siTesla,
  siToyota,
  siVolkswagen,
  siVolvo,
  type SimpleIcon,
} from 'simple-icons';

const CAR_BRANDS: { name: string; icon: SimpleIcon }[] = [
  { name: 'Audi', icon: siAudi },
  { name: 'BMW', icon: siBmw },
  { name: 'Citroën', icon: siCitroen },
  { name: 'Dacia', icon: siDacia },
  { name: 'DS Automobiles', icon: siDsautomobiles },
  { name: 'Fiat', icon: siFiat },
  { name: 'Ford', icon: siFord },
  { name: 'Honda', icon: siHonda },
  { name: 'Hyundai', icon: siHyundai },
  { name: 'Jeep', icon: siJeep },
  { name: 'Kia', icon: siKia },
  { name: 'Mazda', icon: siMazda },
  { name: 'MINI', icon: siMini },
  { name: 'Mitsubishi', icon: siMitsubishi },
  { name: 'Nissan', icon: siNissan },
  { name: 'Opel', icon: siOpel },
  { name: 'Peugeot', icon: siPeugeot },
  { name: 'Porsche', icon: siPorsche },
  { name: 'Renault', icon: siRenault },
  { name: 'SEAT', icon: siSeat },
  { name: 'ŠKODA', icon: siSkoda },
  { name: 'Subaru', icon: siSubaru },
  { name: 'Suzuki', icon: siSuzuki },
  { name: 'Tesla', icon: siTesla },
  { name: 'Toyota', icon: siToyota },
  { name: 'Volkswagen', icon: siVolkswagen },
  { name: 'Volvo', icon: siVolvo },
];

const OTHER_MAKE = '__other__';

const STAGES = [
  'Είσοδος',
  'Φανοποιείο',
  'Βαφείο',
  'Συναρμολόγηση',
  'Γυάλισμα',
  'Έτοιμο',
  'Παραδόθηκε',
];

const BLOCKERS = [
  'Κανένα',
  'Αναμονή ανταλλακτικών',
  'Αναμονή έγκρισης',
  'Σε αναμονή',
];

interface RepairJob {
  id: string;
  current_stage: string;
  blocker_status: string;
  damage_notes: string;
  insurance_company: string | null;
  entry_date: string;
  is_active: boolean;
  vehicles: {
    id: string;
    plate: string;
    make: string;
    color: string | null;
    customers: {
      full_name: string;
      phone: string | null;
    } | null;
  };
}

// Κανονικοποίηση πινακίδας (π.χ. "ικβ 12-34" -> "ΙΚΒ1234")
function normalizePlate(plate: string) {
  return plate.toUpperCase().replace(/[^Α-ΩA-Z0-9]/g, '');
}

function BrandMark({ icon, className }: { icon: SimpleIcon; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <path fill="currentColor" d={icon.path} />
    </svg>
  );
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // App states
  const [jobs, setJobs] = useState<RepairJob[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDelivered, setShowDelivered] = useState(false);
  const [selectedJob, setSelectedJob] = useState<RepairJob | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // New Entry Form states
  const [plate, setPlate] = useState('');
  const [selectedMake, setSelectedMake] = useState('');
  const [customMake, setCustomMake] = useState('');
  const [model, setModel] = useState('');
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [color, setColor] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [damageNotes, setDamageNotes] = useState('');
  const [insurance, setInsurance] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchJobs();
  }, [session]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError('Λάθος email ή κωδικός πρόσβασης.');
  }

  async function fetchJobs() {
    const { data, error } = await supabase
      .from('repair_jobs')
      .select(`
        id,
        current_stage,
        blocker_status,
        damage_notes,
        insurance_company,
        entry_date,
        is_active,
        vehicles (
          id,
          plate,
          make,
          color,
          customers (
            full_name,
            phone
          )
        )
      `)
      .is('archived_at', null)
      .order('entry_date', { ascending: false });

    if (!error && data) {
      setJobs(data as any);
    }
  }

  async function handleCreateEntry(e: React.FormEvent) {
    e.preventDefault();
    const cleanPlate = normalizePlate(plate);
    const make = selectedMake === OTHER_MAKE ? customMake.trim() : selectedMake;
    if (!cleanPlate || !make || !model.trim()) return;
    setSaving(true);

    try {
      // 1. Έλεγχος αν υπάρχει ήδη το όχημα
      let { data: existingVehicle } = await supabase
        .from('vehicles')
        .select('id, customer_id')
        .eq('plate', cleanPlate)
        .maybeSingle();

      let vehicleId = existingVehicle?.id;

      // 2. Αν δεν υπάρχει, φτιάχνουμε πελάτη (αν δόθηκε όνομα) και όχημα
      if (!vehicleId) {
        let customerId = null;
        if (customerName.trim()) {
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert({ full_name: customerName.trim(), phone: customerPhone.trim() || null })
            .select('id')
            .single();
          customerId = newCustomer?.id || null;
        }

        const { data: newVehicle, error: vErr } = await supabase
          .from('vehicles')
          .insert({
            plate: cleanPlate,
            make: `${make} ${model.trim()}`,
            color: color.trim() || null,
            customer_id: customerId,
          })
          .select('id')
          .single();

        if (vErr) throw vErr;
        vehicleId = newVehicle.id;
      }

      // 3. Δημιουργία νέας επισκευής
      const { data: newJob, error: jErr } = await supabase
        .from('repair_jobs')
        .insert({
          vehicle_id: vehicleId,
          current_stage: 'Είσοδος',
          blocker_status: 'Κανένα',
          damage_notes: damageNotes.trim() || 'Χωρίς σημειώσεις',
          insurance_company: insurance.trim() || null,
        })
        .select('id')
        .single();

      if (jErr) throw jErr;

      // 4. Καταγραφή στο ιστορικό
      await supabase.from('stage_history').insert({
        job_id: newJob.id,
        stage: 'Είσοδος',
        notes: 'Αρχική καταχώρηση (v0.1)',
      });

      // Καθαρισμός φόρμας & ανανέωση
      setPlate('');
      setSelectedMake('');
      setCustomMake('');
      setModel('');
      setShowBrandPicker(false);
      setBrandSearch('');
      setColor('');
      setCustomerName('');
      setCustomerPhone('');
      setDamageNotes('');
      setInsurance('');
      setShowNewModal(false);
      await fetchJobs();
    } catch (err: any) {
      alert('Σφάλμα αποθήκευσης: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateStage(job: RepairJob, newStage: string) {
    if (!window.confirm(`Να αλλάξει το στάδιο του ${job.vehicles.plate} σε "${newStage}";`)) return;

    const isDelivered = newStage === 'Παραδόθηκε';
    await supabase
      .from('repair_jobs')
      .update({
        current_stage: newStage,
        is_active: !isDelivered,
        delivery_date: isDelivered ? new Date().toISOString() : null,
      })
      .eq('id', job.id);

    await supabase.from('stage_history').insert({
      job_id: job.id,
      stage: newStage,
    });

    setSelectedJob(null);
    await fetchJobs();
  }

  async function updateBlocker(job: RepairJob, newBlocker: string) {
    await supabase
      .from('repair_jobs')
      .update({ blocker_status: newBlocker })
      .eq('id', job.id);

    setSelectedJob({ ...job, blocker_status: newBlocker });
    await fetchJobs();
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-emerald-400">Φόρτωση ARGOS...</div>;
  }

  // ΟΘΟΝΗ LOGIN
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0d0f11]">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-[#16191d] border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Car size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-white">PROJECT ARGOS</h1>
              <p className="text-xs text-zinc-400">Σύστημα Διαχείρισης Φανοποιείου v0.1</p>
            </div>
          </div>

          {authError && <p className="text-sm text-red-400 bg-red-950/40 p-2.5 rounded-lg">{authError}</p>}

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0d0f11] border border-zinc-700 rounded-xl px-3.5 py-3 text-white focus:border-emerald-500 outline-none"
              placeholder="name@workshop.gr"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Κωδικός</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0d0f11] border border-zinc-700 rounded-xl px-3.5 py-3 text-white focus:border-emerald-500 outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 rounded-xl transition"
          >
            Είσοδος στο Συνεργείο
          </button>
        </form>
      </div>
    );
  }

  // ΦΙΛΤΡΑΡΙΣΜΑ ΕΝΕΡΓΩΝ Ή ΠΑΡΑΔΟΜΕΝΩΝ ΟΧΗΜΑΤΩΝ
  const filteredJobs = jobs.filter((j) => {
    const q = searchQuery.toLowerCase();
    const matchesStatus = showDelivered ? !j.is_active : j.is_active;
    return matchesStatus && (
      j.vehicles.plate.toLowerCase().includes(q) ||
      j.vehicles.make.toLowerCase().includes(q) ||
      (j.vehicles.color && j.vehicles.color.toLowerCase().includes(q)) ||
      (j.vehicles.customers?.full_name && j.vehicles.customers.full_name.toLowerCase().includes(q))
    );
  });
  const selectedBrand = CAR_BRANDS.find((brand) => brand.name === selectedMake);

  return (
    <div className="min-h-screen bg-[#0d0f11] text-zinc-100 pb-24">
      {/* HEADER */}
      <header className="sticky top-0 z-10 bg-[#121518]/95 backdrop-blur border-b border-zinc-800 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Wrench size={18} />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-white">ARGOS <span className="text-xs text-emerald-400 font-normal">v0.1</span></h1>
            <p className="text-[11px] text-zinc-400">{jobs.filter((job) => job.is_active).length} ενεργά οχήματα μέσα</p>
          </div>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="p-2.5 text-zinc-400 hover:text-white rounded-xl bg-zinc-800/50"
          title="Αποσύνδεση"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* ΑΝΑΖΗΤΗΣΗ & ΝΕΑ ΕΙΣΑΓΩΓΗ */}
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 text-zinc-500" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Πινακίδα, μοντέλο, χρώμα ή πελάτης..."
              className="w-full bg-[#16191d] border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 rounded-xl font-semibold flex items-center gap-1.5 shrink-0"
          >
            <Plus size={20} />
            <span>Νέο</span>
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowDelivered(false)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${
              !showDelivered
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-[#16191d] border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Ενεργά
          </button>
          <button
            onClick={() => setShowDelivered(true)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${
              showDelivered
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-[#16191d] border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Παραδομένα / Αρχείο
          </button>
        </div>

        {/* ΛΙΣΤΑ ΕΝΕΡΓΩΝ Ή ΠΑΡΑΔΟΜΕΝΩΝ ΕΠΙΣΚΕΥΩΝ */}
        {filteredJobs.length === 0 ? (
          <div className="text-center py-16 bg-[#16191d] rounded-2xl border border-zinc-800/60">
            <Car className="mx-auto text-zinc-600 mb-2" size={32} />
            <p className="text-zinc-400 text-sm">
              {showDelivered ? 'Δεν βρέθηκαν παραδομένα οχήματα.' : 'Δεν βρέθηκαν ενεργά οχήματα.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className="bg-[#16191d] hover:bg-[#1b1f24] border border-zinc-800 rounded-2xl p-4 cursor-pointer transition active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-zinc-900 border border-zinc-700 text-emerald-400 font-mono font-bold text-sm px-2.5 py-0.5 rounded-md">
                        {job.vehicles.plate}
                      </span>
                      <span className="font-semibold text-white">
                        {job.vehicles.make}
                      </span>
                      {job.vehicles.color && (
                        <span className="text-xs text-zinc-400">({job.vehicles.color})</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-300 mt-1.5">{job.damage_notes}</p>
                    {job.vehicles.customers?.full_name && (
                      <p className="text-xs text-zinc-500 mt-1">
                        Πελάτης: {job.vehicles.customers.full_name} {job.vehicles.customers.phone ? `• ${job.vehicles.customers.phone}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0 space-y-1.5">
                    <span className="inline-block bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-medium px-2.5 py-1 rounded-lg">
                      {job.current_stage}
                    </span>
                    {job.blocker_status && job.blocker_status !== 'Κανένα' && (
                      <div className="flex items-center justify-end gap-1 text-[11px] text-amber-400">
                        <AlertCircle size={12} />
                        <span>{job.blocker_status}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: ΚΑΡΤΕΛΑ ΟΧΗΜΑΤΟΣ & ΑΛΛΑΓΗ ΣΤΑΔΙΟΥ */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#16191d] border border-zinc-800 w-full max-w-lg rounded-2xl p-5 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-emerald-400 font-mono font-bold text-lg">{selectedJob.vehicles.plate}</span>
                <h2 className="text-white font-semibold">{selectedJob.vehicles.make} {selectedJob.vehicles.color && `• ${selectedJob.vehicles.color}`}</h2>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-zinc-400 hover:text-white px-3 py-1 bg-zinc-800 rounded-lg text-sm">
                Κλείσιμο
              </button>
            </div>

            <div className="bg-[#0d0f11] p-3.5 rounded-xl border border-zinc-800/80 space-y-1">
              <p className="text-xs text-zinc-400">Ζημιά / Εργασίες:</p>
              <p className="text-sm text-zinc-200">{selectedJob.damage_notes}</p>
              {selectedJob.insurance_company && (
                <p className="text-xs text-emerald-400 pt-1">Ασφαλιστική: {selectedJob.insurance_company}</p>
              )}
            </div>

            {/* ΕΜΠΟΔΙΟ / ΑΝΑΜΟΝΗ */}
            <div>
              <label className="block text-xs text-zinc-400 mb-2">Κατάσταση Αναμονής / Εμπόδιο</label>
              <div className="grid grid-cols-2 gap-2">
                {BLOCKERS.map((b) => (
                  <button
                    key={b}
                    onClick={() => updateBlocker(selectedJob, b)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-medium border text-left transition ${
                      selectedJob.blocker_status === b
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-[#0d0f11] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* ΣΤΑΔΙΑ ΕΠΙΣΚΕΥΗΣ */}
            <div>
              <label className="block text-xs text-zinc-400 mb-2">Αλλαγή Σταδίου Επισκευής</label>
              <div className="grid grid-cols-2 gap-2">
                {STAGES.map((stage) => {
                  const active = selectedJob.current_stage === stage;
                  return (
                    <button
                      key={stage}
                      onClick={() => updateStage(selectedJob, stage)}
                      className={`py-3 px-3.5 rounded-xl text-sm font-medium border flex items-center justify-between transition ${
                        active
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-[#0d0f11] border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <span>{stage}</span>
                      {active && <CheckCircle2 size={16} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ΝΕΑ ΕΙΣΑΓΩΓΗ ΟΧΗΜΑΤΟΣ */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4">
          <form onSubmit={handleCreateEntry} className="bg-[#16191d] border border-zinc-800 w-full max-w-lg rounded-2xl p-5 space-y-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-white font-bold">Νέα Είσοδος Οχήματος</h2>
              <button type="button" onClick={() => setShowNewModal(false)} className="text-zinc-400 hover:text-white text-sm">
                Άκυρο
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Πινακίδα *</label>
                <input
                  required
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  placeholder="π.χ. ΙΚΒ 1234"
                  className="w-full bg-[#0d0f11] border border-zinc-700 rounded-xl px-3 py-2.5 text-white uppercase font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Χρώμα</label>
                <input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="π.χ. Μαύρο"
                  className="w-full bg-[#0d0f11] border border-zinc-700 rounded-xl px-3 py-2.5 text-white"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs text-zinc-400 mb-1">Μάρκα *</label>
              <button
                type="button"
                aria-expanded={showBrandPicker}
                onClick={() => setShowBrandPicker((open) => !open)}
                className="w-full bg-[#0d0f11] border border-zinc-700 rounded-xl px-3 py-2.5 text-white flex items-center gap-3 text-left"
              >
                {selectedMake !== OTHER_MAKE && selectedBrand ? (
                  <BrandMark
                    icon={selectedBrand.icon}
                    className="w-6 h-6 text-emerald-400 shrink-0"
                  />
                ) : (
                  <Car size={22} className="text-emerald-400 shrink-0" />
                )}
                <span className="flex-1 truncate">
                  {selectedMake === OTHER_MAKE ? customMake || 'Άλλη μάρκα' : selectedMake || 'Επίλεξε μάρκα'}
                </span>
                <ChevronDown size={18} className="text-zinc-400 shrink-0" />
              </button>

              {showBrandPicker && (
                <div className="absolute z-30 mt-2 w-full rounded-xl border border-zinc-700 bg-[#16191d] p-3 shadow-xl">
                  <input
                    autoFocus
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    placeholder="Αναζήτηση μάρκας..."
                    className="w-full bg-[#0d0f11] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <div className="mt-2 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto">
                    {CAR_BRANDS.filter((brand) =>
                      brand.name.toLowerCase().includes(brandSearch.toLowerCase()),
                    ).map((brand) => (
                      <button
                        key={brand.name}
                        type="button"
                        onClick={() => {
                          setSelectedMake(brand.name);
                          setShowBrandPicker(false);
                          setBrandSearch('');
                        }}
                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition ${
                          selectedMake === brand.name
                            ? 'border-emerald-500 bg-emerald-500/10 text-white'
                            : 'border-zinc-800 text-zinc-300 hover:border-zinc-600'
                        }`}
                      >
                        <BrandMark icon={brand.icon} className="h-5 w-5 shrink-0 text-emerald-400" />
                        <span className="truncate">{brand.name}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMake(OTHER_MAKE);
                        setShowBrandPicker(false);
                        setBrandSearch('');
                      }}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition ${
                        selectedMake === OTHER_MAKE
                          ? 'border-emerald-500 bg-emerald-500/10 text-white'
                          : 'border-zinc-800 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      <Car size={20} className="shrink-0 text-emerald-400" />
                      <span className="truncate">Άλλη μάρκα</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {selectedMake === OTHER_MAKE && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Όνομα μάρκας *</label>
                <input
                  required
                  value={customMake}
                  onChange={(e) => setCustomMake(e.target.value)}
                  placeholder="π.χ. Mercedes-Benz"
                  className="w-full bg-[#0d0f11] border border-zinc-700 rounded-xl px-3 py-2.5 text-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Μοντέλο *</label>
              <input
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="π.χ. Yaris"
                className="w-full bg-[#0d0f11] border border-zinc-700 rounded-xl px-3 py-2.5 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Όνομα Πελάτη</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ονοματεπώνυμο"
                  className="w-full bg-[#0d0f11] border border-zinc-700 rounded-xl px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Τηλέφωνο</label>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="69..."
                  className="w-full bg-[#0d0f11] border border-zinc-700 rounded-xl px-3 py-2.5 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Περιγραφή Ζημιάς</label>
              <textarea
                rows={2}
                value={damageNotes}
                onChange={(e) => setDamageNotes(e.target.value)}
                placeholder="π.χ. Πίσω προφυλακτήρας, αριστερό φτερό..."
                className="w-full bg-[#0d0f11] border border-zinc-700 rounded-xl px-3 py-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Ασφαλιστική (προαιρετικό)</label>
              <input
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
                placeholder="π.χ. Εθνική Ασφαλιστική"
                className="w-full bg-[#0d0f11] border border-zinc-700 rounded-xl px-3 py-2.5 text-white"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl mt-2"
            >
              {saving ? 'Αποθήκευση...' : 'Καταχώρηση Οχήματος'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
