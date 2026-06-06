import yahooFinance from "yahoo-finance2";

yahooFinance.setGlobalConfig({
	queue: {
		concurrency: 8
	},
	validation: {
		logErrors: false,
		logOptionsErrors: false
	}
});

export default yahooFinance;