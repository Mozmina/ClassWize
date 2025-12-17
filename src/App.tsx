import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Gamepad2,
  Box,
  List,
  Grid,
  AlertCircle,
  Check,
  Trash2,
  X,
  Plus,
  Shield,
  Download,
  Upload,
  LogOut,
  Lock,
  Settings,
  AlertTriangle,
  Database,
  Activity,
  Save,
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  writeBatch,
  getDoc,
} from 'firebase/firestore';

// --- CONFIGURATION CONSTANTES FIXES ---

const ADMIN_CODE = '123789';

const CRENEAUX = [
  {
    id: 1,
    label: '08:00 - 08:55',
    start: '08:00',
    end: '08:55',
    type: 'Matin',
  },
  {
    id: 2,
    label: '08:55 - 09:50',
    start: '08:55',
    end: '09:50',
    type: 'Matin',
  },
  {
    id: 3,
    label: '10:05 - 11:00',
    start: '10:05',
    end: '11:00',
    type: 'Matin',
  },
  {
    id: 4,
    label: '11:00 - 11:55',
    start: '11:00',
    end: '11:55',
    type: 'Matin',
  },
  {
    id: 5,
    label: '13:00 - 13:55',
    start: '13:00',
    end: '13:55',
    type: 'Après-midi',
  },
  {
    id: 6,
    label: '13:55 - 14:50',
    start: '13:55',
    end: '14:50',
    type: 'Après-midi',
  },
  {
    id: 7,
    label: '15:05 - 16:00',
    start: '15:05',
    end: '16:00',
    type: 'Après-midi',
  },
  {
    id: 8,
    label: '16:00 - 16:55',
    start: '16:00',
    end: '16:55',
    type: 'Après-midi',
  },
];

const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

// --- FIREBASE SETUP ---

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyCCjxSGIu2jjPDPaWR_kwXSx_8Gf-PB0BE',
  authDomain: 'reservationclasswise.firebaseapp.com',
  projectId: 'reservationclasswise',
  storageBucket: 'reservationclasswise.firebasestorage.app',
  messagingSenderId: '9174589870',
  appId: '1:9174589870:web:c056c42a4449f37a8a683f',
  measurementId: 'G-KLCJE9KSKF',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- UTILITAIRES ---

const getMonday = (d) => {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const formatDateFR = (date) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getIsoDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- COMPOSANTS UI ---

const Button = ({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  title = '',
}) => {
  const baseStyle =
    'px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center justify-center gap-2';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
    secondary:
      'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100 px-2',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, color = 'gray' }) => {
  const colors = {
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    orange: 'bg-orange-100 text-orange-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
        colors[color] || colors.gray
      }`}
    >
      {children}
    </span>
  );
};

// --- COMPOSANT PRINCIPAL ---

export default function App() {
  const [user, setUser] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [currentMonday, setCurrentMonday] = useState(getMonday(new Date()));
  const [view, setView] = useState('grid');

  // -- CONFIG STATE (Global Stock) --
  const [config, setConfig] = useState({
    maxHubs: 2,
    maxManettes: 40,
  });

  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showSettings, setShowSettings] = useState(false); // Modal Settings
  const fileInputRef = useRef(null);

  // Config Modal States
  const [tempConfig, setTempConfig] = useState({ ...config });
  const [configConflicts, setConfigConflicts] = useState(null); // List of conflicts if any

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    nom: '',
    groupe: '',
    nbManettes: 0,
    activite: '',
    commentaire: '',
  });

  const [notification, setNotification] = useState(null);

  // --- AUTH & DATA LOADING ---

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Tentative de connexion anonyme
        await signInAnonymously(auth);
      } catch (error) {
        console.error('Erreur Auth:', error);
        // Gestion spécifique de l'erreur de configuration manquante
        if (
          error.code === 'auth/configuration-not-found' ||
          error.code === 'auth/admin-restricted-operation'
        ) {
          setNotification({
            msg: "ACTION REQUISE : Activez l'authentification 'Anonyme' dans votre console Firebase !",
            type: 'error',
          });
        } else {
          setNotification({
            msg: `Erreur connexion: ${error.message}`,
            type: 'error',
          });
        }
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Fetch Reservations
  useEffect(() => {
    if (!user) return;
    // Collection 'reservations' à la racine
    const q = query(collection(db, 'reservations'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const res = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate
            ? doc.data().created_at.toDate()
            : new Date(),
        }));
        setReservations(res);
      },
      (error) => console.error('Erreur lecture reservations:', error)
    );
    return () => unsubscribe();
  }, [user]);

  // Fetch Config (Settings)
  useEffect(() => {
    if (!user) return;
    // Document 'global' dans la collection 'settings'
    const docRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data());
        setTempConfig(docSnap.data());
      } else {
        // Init default if doesn't exist
        const defaultConfig = { maxHubs: 2, maxManettes: 40 };
        setDoc(docRef, defaultConfig);
        setConfig(defaultConfig);
        setTempConfig(defaultConfig);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // --- LOGIQUE METIER ---

  const currentWeekDays = useMemo(() => {
    return DAYS_OF_WEEK.map((dayName, index) => {
      const date = addDays(currentMonday, index);
      return {
        name: dayName,
        date: date,
        dateStr: getIsoDate(date),
        displayDate: formatDateFR(date),
      };
    });
  }, [currentMonday]);

  const getSlotStatus = (dateStr, slotId) => {
    const slotReservations = reservations.filter(
      (r) =>
        r.date_jour === dateStr &&
        r.creneau_id === slotId &&
        r.statut !== 'annulée'
    );

    const hubsReserved = slotReservations.reduce(
      (acc, curr) => acc + (parseInt(curr.nb_hubs) || 0),
      0
    );
    const manettesReserved = slotReservations.reduce(
      (acc, curr) => acc + (parseInt(curr.nb_manettes) || 0),
      0
    );

    // Use Dynamic Config
    const hubsRestants = config.maxHubs - hubsReserved;
    const manettesRestantes = config.maxManettes - manettesReserved;

    // RÈGLE : Complet si 0 Hub OU 0 Manette
    const isFull = hubsRestants <= 0 || manettesRestantes <= 0;
    const isEmpty = slotReservations.length === 0;

    let statusColor = 'bg-white';
    let textColor = 'text-green-700';
    let statusLabel = 'Disponible';

    if (isFull) {
      statusColor = 'bg-red-50/50';
      textColor = 'text-red-700';
      statusLabel = 'Complet';
    } else if (!isEmpty) {
      statusColor = 'bg-blue-50/50';
      textColor = 'text-blue-700';
      statusLabel = 'Partiel';
    }

    return {
      hubsRestants,
      manettesRestantes,
      hubsReserved,
      manettesReserved,
      count: slotReservations.length,
      slotReservations,
      statusColor,
      textColor,
      statusLabel,
      isFull,
      isEmpty,
    };
  };

  // --- ADMIN FUNCTIONS ---

  const handleAdminAuth = (e) => {
    e.preventDefault();
    if (adminPassword === ADMIN_CODE) {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword('');
      showNotification('Mode Admin activé', 'success');
    } else {
      showNotification('Code incorrect', 'error');
    }
  };

  const handlePurgeHistory = async () => {
    const today = getIsoDate(new Date());
    if (
      !confirm(
        "Êtes-vous sûr de vouloir supprimer définitivement toutes les réservations AVANT aujourd'hui ?"
      )
    )
      return;

    const oldReservations = reservations.filter((r) => r.date_jour < today);
    const batch = writeBatch(db);

    oldReservations.forEach((r) => {
      const docRef = doc(db, 'reservations', r.id);
      batch.delete(docRef);
    });

    try {
      await batch.commit();
      showNotification(
        `${oldReservations.length} anciennes réservations supprimées`,
        'success'
      );
    } catch (e) {
      console.error(e);
      showNotification('Erreur lors de la purge', 'error');
    }
  };

  // --- CONFIG & CONFLICT CHECK ---

  const checkConfigConflicts = (newHubs, newManettes) => {
    const conflicts = [];

    // Group reservations by slot
    const slots = {};
    reservations
      .filter((r) => r.statut !== 'annulée')
      .forEach((r) => {
        const key = `${r.date_jour}_${r.creneau_id}`;
        if (!slots[key])
          slots[key] = {
            date: r.date_jour,
            slotId: r.creneau_id,
            hubs: 0,
            manettes: 0,
          };
        slots[key].hubs += r.nb_hubs || 0;
        slots[key].manettes += r.nb_manettes || 0;
      });

    // Check against new limits
    Object.values(slots).forEach((slot) => {
      if (slot.hubs > newHubs) {
        conflicts.push({
          type: 'Hubs',
          date: slot.date,
          slotId: slot.slotId,
          needed: slot.hubs,
          limit: newHubs,
        });
      }
      if (slot.manettes > newManettes) {
        conflicts.push({
          type: 'Manettes',
          date: slot.date,
          slotId: slot.slotId,
          needed: slot.manettes,
          limit: newManettes,
        });
      }
    });

    return conflicts;
  };

  const handleSaveConfig = async (force = false) => {
    const conflicts = checkConfigConflicts(
      tempConfig.maxHubs,
      tempConfig.maxManettes
    );

    if (conflicts.length > 0 && !force) {
      setConfigConflicts(conflicts);
      return;
    }

    try {
      await setDoc(doc(db, 'settings', 'global'), tempConfig);
      showNotification('Configuration mise à jour !', 'success');
      setShowSettings(false);
      setConfigConflicts(null);
    } catch (e) {
      console.error(e);
      showNotification('Erreur sauvegarde config', 'error');
    }
  };

  // --- CSV ACTIONS ---

  const handleExportCSV = () => {
    const headers = [
      'id',
      'date_jour',
      'creneau_id',
      'reservant_nom',
      'groupe',
      'nb_hubs',
      'nb_manettes',
      'activite',
      'commentaire',
      'statut',
    ];
    const rows = reservations.map((r) => [
      r.id,
      r.date_jour,
      r.creneau_id,
      `"${(r.reservant_nom || '').replace(/"/g, '""')}"`,
      `"${(r.groupe || '').replace(/"/g, '""')}"`,
      r.nb_hubs,
      r.nb_manettes,
      `"${(r.activite || '').replace(/"/g, '""')}"`,
      `"${(r.commentaire || '').replace(/"/g, '""')}"`,
      r.statut,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `reservations_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    link.click();
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map((h) => h.trim());
        const batch = writeBatch(db);
        let count = 0;

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          if (!row) continue;
          const cleanRow = row.map((cell) =>
            cell.startsWith('"') && cell.endsWith('"')
              ? cell.slice(1, -1).replace(/""/g, '"')
              : cell
          );

          const data = {};
          headers.forEach((header, index) => {
            data[header] = cleanRow[index];
          });

          const formattedData = {
            date_jour: data.date_jour,
            creneau_id: parseInt(data.creneau_id),
            reservant_nom: data.reservant_nom,
            groupe: data.groupe,
            nb_hubs: parseInt(data.nb_hubs) || 0,
            nb_manettes: parseInt(data.nb_manettes) || 0,
            activite: data.activite || '',
            commentaire: data.commentaire || '',
            statut: data.statut || 'confirmée',
            semaine_lundi: getIsoDate(getMonday(new Date(data.date_jour))),
            created_at: new Date(),
          };

          if (data.id && data.id.length > 5) {
            const docRef = doc(db, 'reservations', data.id);
            batch.set(docRef, formattedData, { merge: true });
          } else {
            const docRef = doc(collection(db, 'reservations'));
            batch.set(docRef, formattedData);
          }
          count++;
        }
        await batch.commit();
        showNotification(
          `${count} réservations importées/mises à jour`,
          'success'
        );
      } catch (err) {
        console.error(err);
        showNotification("Erreur lors de l'import", 'error');
      }
      e.target.value = null;
    };
    reader.readAsText(file);
  };

  // --- ACTIONS UTILS ---

  const handleWeekChange = (direction) => {
    const newDate = new Date(currentMonday);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentMonday(newDate);
  };

  const handleSlotClick = (day, slot, mode = 'reserve') => {
    const status = getSlotStatus(day.dateStr, slot.id);
    if (mode === 'reserve' && status.isFull) {
      showNotification('Créneau complet (Manettes ou Hubs épuisés)', 'error');
    }
    setSelectedSlot({
      dateStr: day.dateStr,
      slotId: slot.id,
      dayName: day.name,
      dateObj: day.date,
      slotLabel: slot.label,
      status,
    });
    setFormData({
      nom: '',
      groupe: '',
      nbManettes: 0,
      activite: '',
      commentaire: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmitReservation = async (e) => {
    e.preventDefault();
    if (!user || !selectedSlot) return;

    if (selectedSlot.status.hubsRestants < 1) {
      showNotification('Impossible : Plus de hub disponible.', 'error');
      return;
    }
    if (selectedSlot.status.manettesRestantes < 1) {
      showNotification('Impossible : Plus de manette disponible.', 'error');
      return;
    }
    if (formData.nbManettes > selectedSlot.status.manettesRestantes) {
      showNotification(
        `Stock insuffisant (Reste ${selectedSlot.status.manettesRestantes} manettes)`,
        'error'
      );
      return;
    }

    try {
      await addDoc(collection(db, 'reservations'), {
        date_jour: selectedSlot.dateStr,
        creneau_id: selectedSlot.slotId,
        semaine_lundi: getIsoDate(currentMonday),
        created_at: new Date(),
        nb_hubs: 1,
        nb_manettes: parseInt(formData.nbManettes) || 0,
        reservant_nom: formData.nom,
        groupe: formData.groupe,
        activite: formData.activite,
        commentaire: formData.commentaire,
        statut: 'confirmée',
        user_id: user.uid,
      });
      showNotification('Réservation confirmée !', 'success');
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      showNotification('Erreur lors de la réservation', 'error');
    }
  };

  const handleActionClick = (resId, e) => {
    if (e) e.stopPropagation();
    setDeleteId(resId);
  };

  const confirmAction = async () => {
    if (!deleteId) return;
    try {
      const ref = doc(db, 'reservations', deleteId);
      if (isAdmin) {
        await deleteDoc(ref);
        showNotification('Réservation supprimée définitivement', 'success');
      } else {
        await updateDoc(ref, {
          statut: 'annulée',
          motif_annulation: 'Annulé par utilisateur',
        });
        showNotification('Réservation annulée', 'success');
      }
      setDeleteId(null);
      if (isModalOpen) setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      showNotification("Erreur lors de l'action", 'error');
    }
  };

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- VUES ADMIN ---

  const renderAdminLogin = () => {
    if (!showAdminLogin) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield size={20} className="text-blue-600" /> Accès Admin
          </h3>
          <form onSubmit={handleAdminAuth} className="space-y-4">
            <div>
              <input
                autoFocus
                type="password"
                className="w-full border border-gray-300 rounded p-2"
                placeholder="Code de sécurité"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAdminLogin(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button type="submit" className="flex-1">
                Valider
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderSettingsModal = () => {
    if (!showSettings) return null;

    // Simple Stats
    const totalResa = reservations.length;
    const activeResa = reservations.filter(
      (r) => r.statut !== 'annulée'
    ).length;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[65] p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-gray-800 text-white p-4 flex justify-between items-center rounded-t-xl">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Settings size={20} /> Administration & Configuration
            </h2>
            <button
              onClick={() => {
                setShowSettings(false);
                setConfigConflicts(null);
              }}
              className="text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          <div className="overflow-y-auto p-6 space-y-8">
            {/* 1. Global Stock Configuration */}
            <section>
              <h3 className="text-md font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
                <Database size={18} className="text-blue-600" /> Stocks Globaux
              </h3>

              {configConflicts && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
                    <AlertTriangle size={20} /> Attention : Conflits détectés
                  </div>
                  <p className="text-sm text-amber-700 mb-3">
                    La réduction du stock entraîne des conflits avec{' '}
                    {configConflicts.length} créneau(x) déjà réservé(s).
                  </p>
                  <div className="max-h-32 overflow-y-auto bg-white rounded border border-amber-100 p-2 text-xs space-y-1 mb-3">
                    {configConflicts.map((c, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-gray-700"
                      >
                        <span>
                          {formatDateFR(new Date(c.date))} -{' '}
                          {CRENEAUX.find((sl) => sl.id === c.slotId)?.label}
                        </span>
                        <span className="font-bold text-red-600">
                          {c.type}: {c.needed} réservés (Max {c.limit})
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => setConfigConflicts(null)}
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleSaveConfig(true)}
                    >
                      Forcer la mise à jour
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Max de Hubs
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-gray-300 rounded p-2"
                    value={tempConfig.maxHubs}
                    onChange={(e) =>
                      setTempConfig({
                        ...tempConfig,
                        maxHubs: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Max de Manettes
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-gray-300 rounded p-2"
                    value={tempConfig.maxManettes}
                    onChange={(e) =>
                      setTempConfig({
                        ...tempConfig,
                        maxManettes: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => handleSaveConfig(false)}
                  disabled={!!configConflicts}
                >
                  <Save size={16} /> Enregistrer les stocks
                </Button>
              </div>
            </section>

            {/* 2. Stats Dashboard */}
            <section>
              <h3 className="text-md font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
                <Activity size={18} className="text-purple-600" /> Statistiques
                Rapides
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg border text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {totalResa}
                  </div>
                  <div className="text-xs text-gray-500">
                    Total Réservations
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {activeResa}
                  </div>
                  <div className="text-xs text-green-600">Actives</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-center">
                  <div className="text-2xl font-bold text-red-700">
                    {totalResa - activeResa}
                  </div>
                  <div className="text-xs text-red-600">Annulées</div>
                </div>
              </div>
            </section>

            {/* 3. Maintenance Zone */}
            <section>
              <h3 className="text-md font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
                <Trash2 size={18} className="text-red-600" /> Zone de
                Maintenance
              </h3>
              <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-red-800">
                    Purger l'historique
                  </h4>
                  <p className="text-xs text-red-600">
                    Supprime définitivement toutes les réservations antérieures
                    à aujourd'hui.
                  </p>
                </div>
                <Button variant="danger" onClick={handlePurgeHistory}>
                  Purger
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  };

  const renderConfirmation = () => {
    if (!deleteId) return null;
    const isHardDelete = isAdmin;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full">
          <div className="flex flex-col items-center text-center mb-4">
            <div
              className={`p-3 rounded-full mb-3 ${
                isHardDelete
                  ? 'bg-red-100 text-red-600'
                  : 'bg-orange-100 text-orange-600'
              }`}
            >
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {isHardDelete
                ? 'Suppression Définitive'
                : 'Annuler la réservation'}
            </h3>
            <p className="text-gray-600 mt-2 text-sm">
              {isHardDelete
                ? 'Attention : Cette action effacera totalement la réservation de la base de données. Aucune trace ne sera conservée.'
                : 'Voulez-vous annuler cette réservation ? Elle restera visible mais libérera le stock.'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setDeleteId(null)}
              className="flex-1"
            >
              Retour
            </Button>
            <Button variant="danger" onClick={confirmAction} className="flex-1">
              {isHardDelete ? 'Supprimer' : 'Annuler'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!isModalOpen || !selectedSlot) return null;

    const { status } = selectedSlot;
    const canReserve = status.hubsRestants > 0 && status.manettesRestantes > 0;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar size={20} />
                {selectedSlot.dayName} {formatDateFR(selectedSlot.dateObj)}
              </h2>
              <p className="text-blue-100 flex items-center gap-2 mt-1">
                <Clock size={16} /> {selectedSlot.slotLabel}
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-white/80 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          <div className="overflow-y-auto p-6 space-y-6">
            {/* Stock Display */}
            <div className="flex gap-4">
              <div
                className={`flex-1 p-3 rounded-lg border ${
                  status.hubsRestants <= 0
                    ? 'bg-red-50 border-red-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="text-sm text-gray-600 font-medium">
                  Hubs Dispo
                </div>
                <div
                  className={`text-2xl font-bold ${
                    status.hubsRestants <= 0 ? 'text-red-600' : 'text-blue-700'
                  }`}
                >
                  {status.hubsRestants < 0 ? 0 : status.hubsRestants}{' '}
                  <span className="text-sm font-normal text-gray-500">
                    / {config.maxHubs}
                  </span>
                </div>
              </div>
              <div
                className={`flex-1 p-3 rounded-lg border ${
                  status.manettesRestantes <= 0
                    ? 'bg-red-50 border-red-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="text-sm text-gray-600 font-medium">
                  Manettes Dispo
                </div>
                <div
                  className={`text-2xl font-bold ${
                    status.manettesRestantes <= 0
                      ? 'text-red-600'
                      : 'text-blue-700'
                  }`}
                >
                  {status.manettesRestantes < 0 ? 0 : status.manettesRestantes}{' '}
                  <span className="text-sm font-normal text-gray-500">
                    / {config.maxManettes}
                  </span>
                </div>
              </div>
            </div>

            {/* Form */}
            {canReserve ? (
              <form onSubmit={handleSubmitReservation} className="space-y-4">
                <div className="bg-blue-50 p-3 rounded border border-blue-100 text-blue-800 text-sm flex items-center gap-2">
                  <Box size={16} />
                  <strong>1 Hub</strong> sera attribué.
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom *
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full border border-gray-300 rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Dupont"
                      value={formData.nom}
                      onChange={(e) =>
                        setFormData({ ...formData, nom: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Groupe *
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full border border-gray-300 rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 2CAP-MEI"
                      value={formData.groupe}
                      onChange={(e) =>
                        setFormData({ ...formData, groupe: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nb Manettes (Max {status.manettesRestantes})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={status.manettesRestantes}
                      className="w-full border border-gray-300 rounded-md p-2"
                      value={formData.nbManettes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nbManettes: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Activité
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md p-2"
                    placeholder="Ex: Évaluation, Quiz..."
                    value={formData.activite}
                    onChange={(e) =>
                      setFormData({ ...formData, activite: e.target.value })
                    }
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" className="flex-1">
                    Confirmer réservation
                  </Button>
                </div>
              </form>
            ) : (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2">
                <AlertCircle size={20} />
                <span>Ce créneau est complet (Hub ou Manettes épuisés).</span>
              </div>
            )}

            {/* Existing Reservations List for this Slot */}
            {status.count > 0 && (
              <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold text-gray-800 mb-2">
                  Réservations actuelles ({status.count}):
                </h3>
                <div className="space-y-2">
                  {status.slotReservations.map((r) => (
                    <div
                      key={r.id}
                      className="text-sm bg-gray-50 p-2 rounded flex justify-between items-center border border-gray-200"
                    >
                      <div>
                        <span className="font-medium">{r.reservant_nom}</span>{' '}
                        <span className="text-gray-500">({r.groupe})</span>
                        <div className="text-xs text-gray-500 flex gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Box size={10} /> 1 Hub
                          </span>
                          {r.nb_manettes > 0 && (
                            <span className="flex items-center gap-1">
                              <Gamepad2 size={10} /> {r.nb_manettes}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleActionClick(r.id, e)}
                        className="text-red-500 hover:bg-red-100 p-1 rounded transition-colors"
                        title={isAdmin ? 'Supprimer définitivement' : 'Annuler'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const sortedReservations = [...reservations].sort((a, b) => {
      if (a.date_jour !== b.date_jour)
        return a.date_jour.localeCompare(b.date_jour);
      return a.creneau_id - b.creneau_id;
    });

    return (
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Créneau</th>
                <th className="p-4">Réservant</th>
                <th className="p-4">Matériel</th>
                <th className="p-4">Statut</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedReservations.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    {new Date(r.date_jour).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="p-4">
                    {CRENEAUX.find((c) => c.id === r.creneau_id)?.label ||
                      `Slot ${r.creneau_id}`}
                  </td>
                  <td className="p-4">
                    <div className="font-medium">{r.reservant_nom}</div>
                    <div className="text-xs text-gray-500">{r.groupe}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Badge color="blue">1 Hub</Badge>
                      {r.nb_manettes > 0 && (
                        <Badge color="orange">{r.nb_manettes} Manettes</Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {r.statut === 'annulée' ? (
                      <Badge color="red">Annulée</Badge>
                    ) : (
                      <Badge color="green">Confirmée</Badge>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {(r.statut !== 'annulée' || isAdmin) && (
                      <button
                        onClick={(e) => handleActionClick(r.id, e)}
                        className={`font-medium text-xs border px-2 py-1 rounded transition-colors flex items-center gap-1 ml-auto ${
                          isAdmin
                            ? 'text-red-700 border-red-300 bg-red-50 hover:bg-red-100'
                            : 'text-red-600 border-red-200 bg-red-50 hover:bg-red-100'
                        }`}
                      >
                        <Trash2 size={12} /> {isAdmin ? 'Supprimer' : 'Annuler'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Gamepad2 size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Reservation Classwise
              </h1>
              <p className="text-xs text-gray-500">Gestion Hubs & Manettes</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-gray-100 p-1 rounded-lg self-center">
            {/* View Switchers */}
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-md ${
                view === 'grid'
                  ? 'bg-white shadow text-blue-700'
                  : 'text-gray-500'
              }`}
              title="Vue Planning"
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-md ${
                view === 'list'
                  ? 'bg-white shadow text-blue-700'
                  : 'text-gray-500'
              }`}
              title="Vue Liste"
            >
              <List size={18} />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            {/* Admin Controls */}
            {isAdmin ? (
              <>
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleImportCSV}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  onClick={() => setShowSettings(true)}
                  title="Paramètres & Maintenance"
                >
                  <Settings size={18} />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  title="Importer CSV"
                >
                  <Upload size={18} />
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleExportCSV}
                  title="Exporter CSV"
                >
                  <Download size={18} />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsAdmin(false)}
                  title="Quitter Mode Admin"
                >
                  <LogOut size={18} className="text-red-500" />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setShowAdminLogin(true)}
                title="Mode Admin"
              >
                <Lock size={18} />
              </Button>
            )}
          </div>
        </div>

        {/* Admin Bar Indicator */}
        {isAdmin && (
          <div className="bg-amber-100 text-amber-800 text-xs font-bold text-center py-1">
            MODE ADMIN ACTIF - SUPPRESSION DÉFINITIVE ACTIVÉE
          </div>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* VIEW: PLANNING GRID */}
        {view === 'grid' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={() => handleWeekChange(-1)}>
                  <ChevronLeft size={18} /> Préc
                </Button>
                <div className="text-center w-64">
                  <h2 className="text-lg font-bold text-gray-800">
                    Semaine {formatDateFR(currentMonday)}
                  </h2>
                  <p className="text-sm text-gray-500">
                    au {formatDateFR(addDays(currentMonday, 4))}
                  </p>
                </div>
                <Button variant="outline" onClick={() => handleWeekChange(1)}>
                  Suiv <ChevronRight size={18} />
                </Button>
              </div>
              <Button
                variant="secondary"
                onClick={() => setCurrentMonday(getMonday(new Date()))}
              >
                Aujourd'hui
              </Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header Row */}
                <div className="grid grid-cols-[100px_repeat(5,1fr)] bg-gray-50 border-b border-gray-200">
                  <div className="p-4 font-semibold text-gray-400 text-xs uppercase tracking-wider flex items-center justify-center border-r">
                    Horaire
                  </div>
                  {currentWeekDays.map((day, idx) => (
                    <div
                      key={idx}
                      className={`p-4 text-center border-r last:border-r-0 ${
                        getIsoDate(new Date()) === day.dateStr
                          ? 'bg-blue-50/50'
                          : ''
                      }`}
                    >
                      <div className="font-bold text-gray-800">{day.name}</div>
                      <div
                        className={`text-sm inline-block px-2 py-0.5 rounded-full mt-1 ${
                          getIsoDate(new Date()) === day.dateStr
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-500'
                        }`}
                      >
                        {day.displayDate}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Body Rows */}
                {CRENEAUX.map((slot) => (
                  <div
                    key={slot.id}
                    className="grid grid-cols-[100px_repeat(5,1fr)] border-b border-gray-100 last:border-0 hover:bg-gray-50/30 transition-colors"
                  >
                    <div className="p-3 border-r bg-gray-50 flex flex-col justify-center items-center text-center">
                      <span className="font-bold text-gray-700 text-sm">
                        {slot.start}
                      </span>
                      <span className="text-xs text-gray-400">{slot.end}</span>
                    </div>

                    {currentWeekDays.map((day) => {
                      const status = getSlotStatus(day.dateStr, slot.id);
                      return (
                        <div
                          key={`${day.dateStr}-${slot.id}`}
                          className={`relative border-r last:border-r-0 h-28 flex group border-b-4 border-b-transparent hover:border-b-blue-400 transition-all ${
                            status.isEmpty
                              ? 'cursor-pointer hover:bg-green-50'
                              : ''
                          }`}
                        >
                          {status.isEmpty && (
                            <div
                              onClick={() =>
                                handleSlotClick(day, slot, 'reserve')
                              }
                              className="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-green-600"
                            >
                              <Plus
                                size={24}
                                className="mb-1 opacity-20 group-hover:opacity-100 transition-opacity"
                              />
                              <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                Réserver
                              </span>
                              <div className="text-[10px] mt-2 opacity-50">
                                {status.manettesRestantes} Manettes
                              </div>
                            </div>
                          )}
                          {!status.isEmpty && (
                            <>
                              <div
                                className={`${
                                  status.isFull ? 'w-full' : 'w-1/2'
                                } h-full bg-blue-50 p-2 overflow-y-auto border-r border-blue-100`}
                                onClick={() =>
                                  handleSlotClick(day, slot, 'view')
                                }
                              >
                                <div className="space-y-1">
                                  {status.slotReservations.map((r, i) => (
                                    <div
                                      key={i}
                                      className="text-xs bg-white p-1 rounded shadow-sm border border-blue-100 cursor-pointer hover:border-blue-300"
                                    >
                                      <div className="font-bold truncate text-blue-800">
                                        {r.reservant_nom}
                                      </div>
                                      <div className="text-[10px] text-gray-500 truncate">
                                        {r.groupe}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {!status.isFull && (
                                <div
                                  onClick={() =>
                                    handleSlotClick(day, slot, 'reserve')
                                  }
                                  className="w-1/2 h-full bg-white hover:bg-green-50 cursor-pointer flex flex-col items-center justify-center text-green-600 border-l border-gray-100"
                                >
                                  <Plus size={20} />
                                  <span className="text-[10px] font-bold mt-1">
                                    Réserver
                                  </span>
                                  <span className="text-[9px] text-gray-400">
                                    {status.manettesRestantes} M dispo
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white border border-gray-200 rounded"></div>{' '}
                Libre
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded"></div>{' '}
                Réservé (1 Hub)
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>{' '}
                Complet (0 Hub ou Manette restant)
              </div>
            </div>
          </div>
        )}

        {view === 'list' && renderListView()}
      </main>

      {notification && (
        <div
          className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-medium flex items-center gap-2 animate-bounce-in z-50 ${
            notification.type === 'error' ? 'bg-red-600' : 'bg-green-600'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle size={20} />
          ) : (
            <Check size={20} />
          )}
          {notification.msg}
        </div>
      )}

      {renderModal()}
      {renderAdminLogin()}
      {renderSettingsModal()}
      {renderConfirmation()}
    </div>
  );
}
