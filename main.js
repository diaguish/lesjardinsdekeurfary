// Config : à modifier ici pour changer le numéro WhatsApp ou les liens de réservation.
const CONFIG = {
  phone: '221781409494',
  bookingUrl: 'https://www.booking.com/hotel/sn/maisons-d-hotes-les-jardins-de-keur-fary.html',
  airbnbUrl: '' // Laisser vide tant que l'annonce Airbnb n'existe pas : le lien reste caché.
};

const EUR_PARITY = 655.957; // Parité fixe FCFA -> EUR

document.addEventListener('DOMContentLoaded', () => {
  const logements = Array.from(document.querySelectorAll('.logement'));

  afficherPrixEnEuros(logements);
  remplirSelectLogement(logements);
  configurerDates();
  configurerBarreWhatsappMobile();
  afficherLienAirbnbSiConfigure();

  const selectLogement = document.getElementById('select-logement');
  const selectVoyageurs = document.getElementById('select-voyageurs');
  if (selectLogement) selectLogement.addEventListener('change', configurerLiensWhatsapp);
  if (selectVoyageurs) selectVoyageurs.addEventListener('change', configurerLiensWhatsapp);

  configurerLiensWhatsapp();
});

// Ajoute l'équivalent en euros à côté de chaque prix FCFA affiché.
function afficherPrixEnEuros(logements) {
  logements.forEach((logement) => {
    const prixFcfa = Number(logement.dataset.price);
    const cible = logement.querySelector('.price-eur');
    if (!prixFcfa || !cible) return;
    const prixEur = Math.round(prixFcfa / EUR_PARITY);
    cible.textContent = ` (≈ ${prixEur} €)`;
  });
}

// Construit dynamiquement la liste des logements dans le formulaire de réservation,
// à partir des blocs .logement[data-name][data-price] présents sur la page.
function remplirSelectLogement(logements) {
  const select = document.getElementById('select-logement');
  if (!select) return;

  logements.forEach((logement) => {
    const nom = logement.dataset.name;
    const prix = Number(logement.dataset.price);
    if (!nom) return;
    const option = document.createElement('option');
    option.value = nom;
    option.textContent = prix
      ? `${nom} — ${prix.toLocaleString('fr-FR')} FCFA/nuit`
      : nom;
    if (nom === 'Chambre Deluxe') option.selected = true;
    select.appendChild(option);
  });
}

// Arrivée minimum = aujourd'hui. Départ minimum = arrivée + 1 jour.
// Met aussi à jour le nombre de nuits affiché.
function configurerDates() {
  const inputArrivee = document.getElementById('date-arrivee');
  const inputDepart = document.getElementById('date-depart');
  const hint = document.getElementById('nights-hint');
  if (!inputArrivee || !inputDepart) return;

  const aujourdhui = new Date();
  const isoAujourdhui = toISODate(aujourdhui);
  inputArrivee.min = isoAujourdhui;

  const majDepartMin = () => {
    if (!inputArrivee.value) {
      inputDepart.min = isoAujourdhui;
      return;
    }
    const arrivee = new Date(inputArrivee.value);
    const departMin = new Date(arrivee);
    departMin.setDate(departMin.getDate() + 1);
    const isoDepartMin = toISODate(departMin);
    inputDepart.min = isoDepartMin;
    if (inputDepart.value && inputDepart.value < isoDepartMin) {
      inputDepart.value = isoDepartMin;
    }
  };

  const majNuits = () => {
    const nuits = calculerNuits(inputArrivee.value, inputDepart.value);
    if (hint) {
      if (nuits) {
        hint.hidden = false;
        hint.textContent = `${nuits} nuit${nuits > 1 ? 's' : ''}`;
      } else {
        hint.hidden = true;
      }
    }
  };

  inputArrivee.addEventListener('change', () => {
    majDepartMin();
    majNuits();
    configurerLiensWhatsapp();
  });
  inputDepart.addEventListener('change', () => {
    majNuits();
    configurerLiensWhatsapp();
  });

  majDepartMin();
}

function calculerNuits(iso1, iso2) {
  if (!iso1 || !iso2) return 0;
  const jour = 24 * 60 * 60 * 1000;
  const diff = Math.round((new Date(iso2) - new Date(iso1)) / jour);
  return diff > 0 ? diff : 0;
}

function toISODate(date) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

function formaterDateFr(iso) {
  if (!iso) return '';
  const [annee, mois, jour] = iso.split('-');
  return `${jour}/${mois}/${annee}`;
}

// Remplace les href="#" de secours par de vrais liens wa.me avec un message pré-rempli.
// - Boutons génériques (data-whatsapp sans data-room) : message d'info simple.
// - Boutons de logement (data-room) : reprennent le nom du logement + dates/voyageurs si remplis.
// - Bouton du formulaire : reprend tous les champs remplis.
function configurerLiensWhatsapp() {
  const inputArrivee = document.getElementById('date-arrivee');
  const inputDepart = document.getElementById('date-depart');
  const selectVoyageurs = document.getElementById('select-voyageurs');
  const selectLogement = document.getElementById('select-logement');

  const arrivee = inputArrivee ? inputArrivee.value : '';
  const depart = inputDepart ? inputDepart.value : '';
  const voyageurs = selectVoyageurs ? selectVoyageurs.value : '';
  const nuits = calculerNuits(arrivee, depart);

  // Boutons "Réserver" de chaque logement.
  document.querySelectorAll('[data-whatsapp][data-room]').forEach((lien) => {
    const room = lien.dataset.room;
    let message = `Bonjour, je souhaite réserver : ${room}.`;
    if (arrivee) {
      message += ` Arrivée : ${formaterDateFr(arrivee)}.`;
    }
    if (depart) {
      message += ` Départ : ${formaterDateFr(depart)}${nuits ? ` (${nuits} nuit${nuits > 1 ? 's' : ''})` : ''}.`;
    }
    if (voyageurs) {
      message += ` Voyageurs : ${voyageurs}.`;
    }
    lien.href = construireLienWhatsapp(message);
  });

  // Bouton du formulaire de réservation.
  const boutonFormulaire = document.getElementById('form-whatsapp-btn');
  if (boutonFormulaire) {
    const logement = selectLogement && selectLogement.value ? selectLogement.value : '';
    let message = 'Bonjour, je souhaite réserver';
    message += logement ? ` : ${logement}.` : ' aux Jardins de Keur Fary.';
    if (arrivee) {
      message += ` Arrivée : ${formaterDateFr(arrivee)}.`;
    }
    if (depart) {
      message += ` Départ : ${formaterDateFr(depart)}${nuits ? ` (${nuits} nuit${nuits > 1 ? 's' : ''})` : ''}.`;
    }
    if (voyageurs) {
      message += ` Voyageurs : ${voyageurs}.`;
    }
    boutonFormulaire.href = construireLienWhatsapp(message);
  }

  // Boutons génériques (en-tête, hero, barre mobile, devis catering) : ne pas toucher
  // ceux qui ont déjà un message spécifique dans le HTML (devis catering), seulement
  // s'assurer que le numéro utilisé est bien celui de la config.
  document.querySelectorAll('[data-whatsapp]:not([data-room]):not(#form-whatsapp-btn)').forEach((lien) => {
    const urlActuelle = new URL(lien.href, window.location.href);
    const texte = urlActuelle.searchParams.get('text') || '';
    lien.href = construireLienWhatsapp(texte, true);
  });
}

function construireLienWhatsapp(messageEnClair, dejaEncode) {
  const texte = dejaEncode ? messageEnClair : encodeURIComponent(messageEnClair);
  return `https://wa.me/${CONFIG.phone}?text=${texte}`;
}

// Affiche la barre WhatsApp fixe sur mobile après le hero, et la masque
// pendant que la section Réserver est visible à l'écran.
function configurerBarreWhatsappMobile() {
  const barre = document.getElementById('mobile-whatsapp-bar');
  const hero = document.querySelector('.hero');
  const reserver = document.getElementById('reserver');
  if (!barre || !hero || !('IntersectionObserver' in window)) return;

  let heroVisible = true;
  let reserverVisible = false;

  const majBarre = () => {
    barre.classList.toggle('is-visible', !heroVisible && !reserverVisible);
  };

  const heroObserver = new IntersectionObserver(([entree]) => {
    heroVisible = entree.isIntersecting;
    majBarre();
  }, { threshold: 0 });
  heroObserver.observe(hero);

  if (reserver) {
    const reserverObserver = new IntersectionObserver(([entree]) => {
      reserverVisible = entree.isIntersecting;
      majBarre();
    }, { threshold: 0.15 });
    reserverObserver.observe(reserver);
  }
}

// Masque le lien Airbnb tant que l'URL de l'annonce n'est pas renseignée dans CONFIG.
function afficherLienAirbnbSiConfigure() {
  const wrap = document.getElementById('airbnb-link-wrap');
  const lien = document.getElementById('airbnb-link');
  if (!wrap || !lien) return;
  if (CONFIG.airbnbUrl) {
    lien.href = CONFIG.airbnbUrl;
    wrap.hidden = false;
  } else {
    wrap.hidden = true;
  }
}
