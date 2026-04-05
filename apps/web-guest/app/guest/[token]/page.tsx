// Placeholder — sera implémenté en Phase 7
export default function GuestPage({ params }: { params: { token: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-gray-900">Deltom</h1>
        <p className="text-gray-500 mt-2">Suivi logement — Phase 7 à venir</p>
        <p className="text-xs text-gray-400 mt-4">Token: {params.token}</p>
      </div>
    </div>
  );
}
