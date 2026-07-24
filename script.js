const quoteElement = document.getElementById("quote");
const authorElement = document.getElementById("author");
const button = document.getElementById("new-quote-btn");

async function getQuote() {
    quoteElement.textContent = "Loading...";
    authorElement.textContent = "";

    try {
        const response = await fetch("https://zenquotes.io/api/random");

        if (!response.ok) {
            throw new Error("Failed to fetch quote");
        }

        const data = await response.json();

        quoteElement.textContent = `"${data[0].q}"`;
        authorElement.textContent = `— ${data[0].a}`;

    } catch (error) {
        quoteElement.textContent = "Couldn't load a quote.";
        authorElement.textContent = "";
        console.error(error);
    }
}

button.addEventListener("click", getQuote);

// Load one automatically when the page opens
getQuote();