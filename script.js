const quoteElement = document.getElementById("quote");
const authorElement = document.getElementById("author");
const button = document.getElementById("new-quote-btn");

async function getQuote() {
    quoteElement.textContent = "Loading...";
    authorElement.textContent = "";

    try {
        const response = await fetch("https://dummyjson.com/quotes/random");

        if (!response.ok) {
            throw new Error("Failed to fetch quote");
        }

        const data = await response.json();

        quoteElement.textContent = `"${data.quote}"`;
        authorElement.textContent = `— ${data.author}`;

    } catch (error) {
        quoteElement.textContent = "Couldn't load a quote.";
        authorElement.textContent = "";
        console.error(error);
    }
}

button.addEventListener("click", getQuote);
getQuote();