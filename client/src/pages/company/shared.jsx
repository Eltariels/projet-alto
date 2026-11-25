// Éléments communs aux écrans de l'espace entreprise
import { Link } from 'react-router-dom';
import { ArrowIcon, CheckIcon, ClockIcon, CrossIcon } from '../../components/Icons.jsx';

export const formatSiretDisplay = (s = '') => s.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, '$1 $2 $3 $4');

export const CONTRAT_LABEL = { apprentissage: 'Apprentissage', professionnalisation: 'Professionnalisation' };

export function BackLink({ to = '/entreprise', children = 'Mes offres' }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2 text-sm font-semibold text-azure transition hover:text-night">
      <ArrowIcon className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-0.5" /> {children}
    </Link>
  );
}

// État du contrôle du SIRET, tel que l'entreprise le voit
export function SiretStatus({ company }) {
  const status = company?.siretCheck?.status;
  if (status === 'valide') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald">
        <CheckIcon className="h-4 w-4" /> SIRET vérifié dans l'annuaire des entreprises
      </span>
    );
  }
  if (status === 'invalide') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ruby">
        <CrossIcon className="h-4 w-4" /> SIRET introuvable dans l'annuaire des entreprises
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-dark">
      <ClockIcon className="h-4 w-4" /> Vérification du SIRET en attente : vos offres ne peuvent pas encore être « Vérifiées »
    </span>
  );
}

// Ce que le badge veut dire pour l'entreprise qui publie
export function badgeMessage(offer) {
  switch (offer.badge) {
    case 'verifiee':
      return { tone: 'emerald', text: 'Votre offre est en ligne avec le badge « Vérifiée ».' };
    case 'experience_exigee':
      return {
        tone: 'gold',
        text: "Votre offre demande de l'expérience : elle est signalée « Expérience exigée » aux étudiants. L'alternance sert justement à en acquérir.",
      };
    case 'suspecte':
      return {
        tone: 'ruby',
        text: "Votre offre est signalée comme suspecte aux étudiants. Si l'annonce prête à confusion, clôturez-la et publiez-en une version corrigée.",
      };
    default:
      // Analysée mais sans badge : l'IA la juge fiable, il ne manque que le contrôle du SIRET
      if (offer.analysisStatus === 'analysee') {
        return {
          tone: 'neutral',
          text: "Votre offre est en ligne avec la mention « Analyse en attente » : elle passera « Vérifiée » dès que votre SIRET aura été contrôlé dans l'annuaire des entreprises.",
        };
      }
      return {
        tone: 'neutral',
        text: "Votre offre est en ligne avec la mention « Analyse en attente » : la vérification automatique n'a pas pu se faire. Vous pouvez la relancer depuis la page de l'offre.",
      };
  }
}

export const TONES = {
  emerald: 'border-emerald/30 bg-emerald/5 text-emerald',
  gold: 'border-gold/40 bg-gold/10 text-gold-dark',
  ruby: 'border-ruby/30 bg-ruby/5 text-ruby',
  neutral: 'border-parchment-300 bg-parchment-200/50 text-ink-soft',
};
