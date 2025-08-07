import DesktopGridCard, { DesktopItem } from "./DesktopGridCard";

type DesktopGridProps = {
  items: DesktopItem[];
};

const DesktopGrid: React.FC<DesktopGridProps> = ({ items }) => {
  return (
    <div className="w-full h-screen absolute overflow-hidden top-8">
      {items.map((item) => (
        <DesktopGridCard item={item} />
      ))}
    </div>
  );
};

export default DesktopGrid;
