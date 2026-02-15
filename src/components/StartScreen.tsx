type Props = {
  onStart: () => void;
};

export default function StartScreen({ onStart }: Props) {
  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center" }}>
      <button onClick={onStart} style={{ fontSize: 24, padding: "16px 40px" }}>
        Start
      </button>
    </div>
  );
}
