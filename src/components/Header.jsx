export default function Header() {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 md:px-32 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <i className="fa fa-street-view text-primary text-2xl"></i>
          <h1 className="text-xl font-bold text-gray-800">Pose Estimation</h1>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <a href="#" className="text-gray-600 hover:text-primary transition-colors">Examples</a>
          <a href="#" className="text-gray-600 hover:text-primary transition-colors">About</a>
        </div>
        <button className="md:hidden text-gray-600 hidden">
          <i className="fa fa-bars text-xl"></i>
        </button>
      </div>
    </header>
  );
};