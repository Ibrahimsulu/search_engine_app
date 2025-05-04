import { useRouter } from "next/router";

function PaginationButtons() {
  const router = useRouter();
  const { term, start, type } = router.query;
  const startIndex = parseInt(start) || 0;  // Default to 0 if no start value
  const nextStart = startIndex + 10;
  const prevStart = startIndex - 10;

  console.log("Next start:", nextStart);
  console.log("Prev start:", prevStart);

  return (
    <div className="flex justify-center space-x-4">
      {startIndex > 0 && (
        <button
          onClick={() =>
            router.push({
              pathname: "/search",
              query: {
                term,
                start: prevStart,
                type,
              },
            })
          }
          className="btn"
        >
          Previous
        </button>
      )}

      <button
        onClick={() =>
          router.push({
            pathname: "/search",
            query: {
              term,
              start: nextStart,
              type,
            },
          })
        }
        className="btn"
      >
        Next
      </button>
    </div>
  );
}

export default PaginationButtons;
