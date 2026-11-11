console.log("stock watchdog loaded!!");

const searchInput = document.querySelector("#stockSearch");
const searchButton = document.querySelector("#searchBtn");
const searchResult = document.querySelector("#searchResult");

searchButton.addEventListener("click", function () {
  const searchText = searchInput.value.trim();

  if (searchText == "") {
    searchResult.innerHTML = "<p>Please enter a company name.</p>";
  }

  searchStocks(searchText);
});

const savedStocks = localStorage.getItem("stocks");

const stocks = savedStocks ? JSON.parse(savedStocks) : [];

const savedAlerts = localStorage.getItem("alerts");

const alerts = savedAlerts ? JSON.parse(savedAlerts) : [];

function showAlertForm(symbol, exchange) {
  const alertForm = document.querySelector("#alertForm");

  alertForm.innerHTML = `
      <div class="alert-form">

            <h4>Create Price Alert</h4>

            <p>${symbol}- ${exchange}</p>

            <select id="alertCondition">
                <option value="below">Price goes below</option>
                <option value="above">Price goes above</option>
            </select>

            <input
                type="number"
                id="alertPrice"
                placeholder="Enter target price"
            >

            <button onclick="createAlert('${symbol}','${exchange}')">
                Create Alert
            </button>

        </div>
  `;
}

async function createAlert(symbol, exchange) {
  if ("Notification" in window && Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    console.log(permission);
  }
  const condition = document.querySelector("#alertCondition").value;

  const inputPrice = document.querySelector("#alertPrice");
  const targetPrice = Number(inputPrice.value);

  if (
    inputPrice.value.trim() == "" ||
    !Number.isFinite(targetPrice) ||
    targetPrice < 0
  ) {
    alert("Please enter a valid target price!");
    return;
  }

  const alreadyExists = alerts.some(function (alert) {
    return (
      alert.symbol == symbol &&
      alert.exchange == exchange &&
      alert.condition == condition &&
      alert.targetPrice == targetPrice &&
      alert.active == true
    );
  });

  if (alreadyExists) {
    alert("This alert already exists!");
    return;
  }

  const newAlert = {
    symbol: symbol,
    exchange: exchange,
    condition: condition,
    targetPrice: targetPrice,
    active: true,
  };

  alerts.push(newAlert);

  localStorage.setItem("alerts", JSON.stringify(alerts));

  displayAlerts();

  checkAlerts();
}

function displayAlerts() {
  const alertsContainer = document.querySelector("#alertsContainer");

  alertsContainer.innerHTML = "";

  alerts.forEach(function (alert, index) {
    const alertCard = document.createElement("div");
    alertCard.classList.add("alert-card");

    alertCard.innerHTML = `
      <div>
          <h3>${alert.symbol} - ${alert.exchange}</h3>

          <p>
              Alert when price goes
              <strong>${alert.condition}</strong>
              ₹${alert.targetPrice}
          </p>
          <p>
              Status:${alert.active ? "Active" : "Triggered"}
          </p>
      </div>

      <button onclick="deleteAlert(${index})">
            Delete
      </button>
    `;

    alertsContainer.append(alertCard);
  });
}

function deleteAlert(index) {
  alerts.splice(index, 1);

  localStorage.setItem("alerts", JSON.stringify(alerts));

  displayAlerts();
}

displayWatchlist();
displayAlerts();

function checkAlerts() {
  alerts.forEach(function (alert) {
    if (!alert.active) {
      return;
    }
    const stock = stocks.find(function (stock) {
      return alert.symbol == stock.symbol && alert.exchange == stock.exchange;
    });

    if (!stock) {
      return;
    }

    let triggered = false;

    if (alert.condition == "below") {
      if (stock.price < alert.targetPrice) {
        triggered = true;
      }
    } else if (alert.condition == "above") {
      if (stock.price > alert.targetPrice) {
        triggered = true;
      }
    }

    if (triggered) {
      console.log(`🚨 ALERT: ${alert.symbol} price is ${stock.price}`);

      if (Notification.permission == "granted") {
        new Notification("stock watchdog alert", {
          body: `${alert.symbol}(${alert.exchange}) is now $${stock.price}`,
        });
      }

      alert.active = false;
      localStorage.setItem("alerts", JSON.stringify(alerts));
      displayAlerts();
    }
  });
}

function searchStocks(query) {
  console.log("Searching for:", query);
  const API_KEY = "d4c7ea3344694cbfa16d5be6625bec8c";

  fetch(
    `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(query)}&apikey=${API_KEY}`,
  )
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      console.log("search results:", data);

      const results = data.data;

      if (!results || results.length == 0) {
        searchResult.innerHTML = "no stocks found";
        return;
      }

      searchResult.innerHTML = "";

      results.forEach(function (stock) {
        const stockCard = document.createElement("div");

        stockCard.innerHTML = `
          <h3>${stock.instrument_name}</h3>
          <p>Symbol: ${stock.symbol}</p>
          <p>Exchange: ${stock.exchange}</p>
          <p>Country: ${stock.country}</p>

          <button class="select-stock-btn">
          select this stock
          </button>
        `;

        const selectButton = stockCard.querySelector(".select-stock-btn");

        selectButton.addEventListener("click", function () {
          selectStock(stock);
        });

        searchResult.appendChild(stockCard);
      });
    })
    .catch(function (error) {
      console.log("Stock search failed:", error);
      searchResult.innerHTML = "Search failed. Please try again.";
    });
}

function selectStock(stock) {
  console.log("selected stock:", stock);
  fetchSelectedStockPrice(stock);
}

function fetchSelectedStockPrice(stock) {
  const API_KEY = "d4c7ea3344694cbfa16d5be6625bec8c";

  const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(stock.symbol)}&exchange=${encodeURIComponent(stock.exchange)}&apikey=${API_KEY}`;

  fetch(url)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      console.log("price response: ", data);

      if (!data.price) {
        console.log("Price unavailable:", data);
        searchResult.innerHTML = "<p>Price unavailable for this listing.</p>";
        return;
      }

      const price = Number(data.price);

      if (!Number.isFinite(price) || price <= 0) {
        console.log("Invalid price:", data.price);
        return;
      }

      const existingStock = stocks.find(function (item) {
        return item.symbol === stock.symbol && item.exchange === stock.exchange;
      });

      if (existingStock) {
        existingStock.price = price;
      } else {
        stocks.push({
          name: stock.symbol,
          instrumentName: stock.instrument_name,
          symbol: stock.symbol,
          exchange: stock.exchange,
          country: stock.country,
          price: price,
          change: 0,
          alertPrice: price,
        });
      }

      localStorage.setItem("stocks", JSON.stringify(stocks));

      searchResult.innerHTML = `
        <div class="stock-card search-card">
            <h3>${stock.instrument_name}</h3>
            <p>Symbol: ${stock.symbol}</p>
            <p>Exchange: ${stock.exchange}</p>
            <p>Country: ${stock.country}</p>
            <h2>Price: ${price}</h2>
            <button class="alert-btn" id="addSelectedAlert">
              🔔 Add Price Alert
            </button>

            <div id="alertForm"></div>
        </div>
      `;

      document
        .querySelector("#addSelectedAlert")
        .addEventListener("click", function () {
          showAlertForm(stock.symbol, stock.exchange);
        });

      displayWatchlist();
    })
    .catch(function (error) {
      console.log("price fetch failed", error);
    });
}

function displayWatchlist() {
  const stockContainer = document.querySelector("#stockContainer");
  stockContainer.innerHTML = "";

  stocks.forEach(function (stock) {
    const card = document.createElement("div");
    card.classList.add("stock-card");

    card.innerHTML = `
      <h3>${stock.instrumentName || stock.name}</h3>

      <p>Symbol: ${stock.symbol}</p>

      <p>Exchange: ${stock.exchange}</p>

      <p>
        Price: ${stock.price}
      </p>`;

    stockContainer.appendChild(card);
  });
}

async function refreshStockPrices() {
  const API_KEY = "d4c7ea3344694cbfa16d5be6625bec8c";

  stocks.forEach(function (stock) {
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(stock.symbol)}&exchange=${encodeURIComponent(stock.exchange)}&apikey=${API_KEY}`;

    fetch(url)
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (!data.price) {
          console.log("Price unavailable:", stock.symbol, data);
        }

        const price = Number(data.price);

        if (!Number.isFinite(price) || price <= 0) {
          console.log("Invalid price:", stock.symbol, data.price);
          return;
        }

        stock.price = price;

        console.log(stock.symbol, "updated price:", price);

        localStorage.setItem("stocks", JSON.stringify(stocks));

        displayWatchlist();
        checkAlerts();
      })
      .catch(function (error) {
        console.log("Price update failed:", stock.symbol, error);
      });
  });
}

checkAlerts();
refreshStockPrices();

setInterval(function () {
  refreshStockPrices();
}, 60000);

/*setInterval(function () {
  fetchStockData();
}, 1200000);
*/
//console.log(stocks[3].price);

/*setInterval(function () {
  checkAlerts();
  console.log("checking......");
}, 5000);
*/

/*fetch("https://jsonplaceholder.typicode.com/users")
  .then(function (response) {
    return response.json();
  })
  .then(function (data) {
    console.log(data);
  });
*/

/*fetch("https://invalid.example")
  .then(function (response) {
    console.log("Then executed");
  })
  .catch(function (error) {
    console.log("Catch executed");
    console.log(error);
  })
  .then(function () {
    console.log("Next then executed");
  });
*/
