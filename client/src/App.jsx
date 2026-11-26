import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Profile from './pages/Profile.jsx';
import Offers from './pages/Offers.jsx';
import OfferDetail from './pages/OfferDetail.jsx';
import Applications from './pages/Applications.jsx';
import NotFound from './pages/NotFound.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import CompanyRegister from './pages/company/CompanyRegister.jsx';
import CompanyHome from './pages/company/CompanyHome.jsx';
import PublishOffer from './pages/company/PublishOffer.jsx';
import CompanyOffer from './pages/company/CompanyOffer.jsx';
import AdminHome from './pages/admin/AdminHome.jsx';

// Anciennes URL du prototype (/auth et /auth?mode=connexion)
function LegacyAuthRedirect() {
  const [params] = useSearchParams();
  if (params.get('mode') === 'connexion') return <Navigate to="/connexion" replace />;
  const promo = params.get('promo');
  return <Navigate to={promo ? `/inscription?promo=${encodeURIComponent(promo)}` : '/inscription'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/connexion" element={<Login />} />
        <Route path="/inscription" element={<Register />} />
        <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
        <Route path="/reinitialiser-mot-de-passe" element={<ResetPassword />} />
        <Route path="/auth" element={<LegacyAuthRedirect />} />
        <Route element={<ProtectedRoute roles={['etudiant']} />}>
          <Route path="/profil" element={<Profile />} />
          <Route path="/offres" element={<Offers />} />
          <Route path="/offres/:id" element={<OfferDetail />} />
          <Route path="/candidatures" element={<Applications />} />
        </Route>
        {/* Espace entreprise */}
        <Route path="/entreprise/inscription" element={<CompanyRegister />} />
        <Route element={<ProtectedRoute roles={['entreprise']} />}>
          <Route path="/entreprise" element={<CompanyHome />} />
          <Route path="/entreprise/offres/nouvelle" element={<PublishOffer />} />
          <Route path="/entreprise/offres/:id" element={<CompanyOffer />} />
        </Route>
        {/* Back-office */}
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/admin" element={<AdminHome />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
