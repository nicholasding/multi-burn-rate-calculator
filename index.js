function detectionTime(errorThreshold, time, errorRate) {
    const value = errorThreshold * time / errorRate;
    if (value < time) {
        return value;
    }

    return -1;
}

class MultipleBurnRateCalculator {
    constructor() {
        this.form = document.getElementsByTagName('form')[0];

        this.form.addEventListener('input', this.recalculateBurnRates.bind(this));

        this.recalculateBurnRates();
    }

    recalculateBurnRates() {
        const slo = parseFloat(this.form.querySelector('#slo').value);
        const sloWindow = parseFloat(this.form.querySelector('#slo_window').value);
        const errorBudget = 1 - (slo/100);
        const errorThresholds = {};

        for (const humanTime of ['1h', '5m', '6h', '30m']) {
            const budgetConsuption = parseFloat(this.form.querySelector(`#budget_consumption_${humanTime}`).value);

            let [time, kind] = humanTime.split('');
            time = parseInt(time);

            if (kind == 'm') {
                time = time / 60;
            } else if (kind === 'd') {
                time = time * 24;
            }

            const burnRate = (sloWindow * 24) * budgetConsuption / time / 100;
            errorThresholds[humanTime] = burnRate * errorBudget;
            this.form.querySelector(`#burn_rate_${humanTime}`).textContent = burnRate;
        }

        this.drawDetectionTime(errorThresholds);
    }

    drawDetectionTime(errorThresholds) {
        console.info(errorThresholds);

        const startLog = 0.995;
        const pagePoints = [];
        const ticketPoints = [];

        for (let i = 0; i<1000; i++) {
            const errorRate = Math.pow(startLog, i * 2);

            const detectionTime1h = detectionTime(errorThresholds['1h'], (60 * 1), errorRate);
            const detectionTime5m = detectionTime(errorThresholds['5m'], (60 * 6), errorRate);
            const detectionTime6h = detectionTime(errorThresholds['6h'], (60 * 24), errorRate);
            const detectionTime30m = detectionTime(errorThresholds['30m'], (60 * 24 * 3),errorRate);

            let detectionPage = -1;
            if (detectionTime1h < detectionTime5m && detectionTime1h > -1) {
                detectionPage = detectionTime1h;
            } else if (detectionTime5m > -1) {
                detectionPage = detectionTime5m;
            }

            pagePoints.push([errorRate, detectionPage]);

            let detectionTicket = -1;
            if (detectionPage === -1) {
                if (detectionTime6h < detectionTime30m && detectionTime6h > -1) {
                    detectionTicket = detectionTime6h;
                } else if (detectionTime30m > -1) {
                    detectionTicket = detectionTime30m;
                }
            }

            ticketPoints.push([errorRate, detectionTicket]);
        }
        Highcharts.chart('detection_time', {
            title: {
                text: '',
            },
            yAxis: {
                type: 'logarithmic',
                minorTickInterval: 0.1,
                title: {
                    text: 'Time',
                },
                labels:{
                    formatter: (event) => {
                        return Highcharts.dateFormat("%H:%M:%S", new Date(event.value*60*1000));
                    }
                }
            },

            tooltip: {
                pointFormatter: function(event)  {
                    const detectionTime = Highcharts.dateFormat("%H:%M:%S", new Date(this.y*60*1000));
                    return `Detection time: ${detectionTime}<br />Error rate: ${this.x * 100}%` ;
                },
            },
            xAxis: {
                type: 'logarithmic',
                title: {
                    text: 'Error rate',
                },
                labels:{
                    formatter: (event) => {
                        return (event.value * 100) + '%';
                    }
                }
            },

            legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'middle'
            },

            plotOptions: {
                series: {
                    label: {
                        connectorAllowed: false
                    },
                    pointStart: 0,
                }
            },

            series: [{
                name: 'Ticket',
                data: ticketPoints,
            }, {
                name: 'Page',
                data: pagePoints,
            }],
        });
    }
}

new MultipleBurnRateCalculator();
