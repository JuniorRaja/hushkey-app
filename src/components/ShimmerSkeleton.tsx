interface ShimmerSkeletonProps {
  type?: "line" | "circle" | "card";
  count?: number;
  height?: string;
  width?: string;
}

const ShimmerSkeleton = ({
  type = "line",
  count = 1,
  height = "1rem",
  width = "100%",
}: ShimmerSkeletonProps) => {
  const renderSkeleton = () => {
    if (type === "circle") {
      return (
        <div
          className="shimmer shimmer-circle"
          style={{ width: height, height }}
        />
      );
    }

    if (type === "card") {
      return (
        <div
          className="shimmer shimmer-card"
          style={{ width, minHeight: height }}
        >
          <div
            className="shimmer-line"
            style={{ width: "60%", height: "1.5rem", marginBottom: "1rem" }}
          />
          <div
            className="shimmer-line"
            style={{ width: "40%", height: "1rem", marginBottom: "0.5rem" }}
          />
          <div
            className="shimmer-line"
            style={{ width: "80%", height: "1rem" }}
          />
        </div>
      );
    }

    return <div className="shimmer shimmer-line" style={{ height, width }} />;
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} style={{ marginBottom: count > 1 ? "0.75rem" : 0 }}>
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
};

export default ShimmerSkeleton;
