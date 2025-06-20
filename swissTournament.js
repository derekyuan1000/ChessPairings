class SwissTournament {
    constructor(players) {
        this.players = players.map(player => ({
            ...player,
            score: 0,
            opponents: [],
            colorHistory: [],
            upfloats: 0,
            downfloats: 0
        }));
        this.currentRound = 0;
        this.pairings = [];
    }

    firstRound() {
        this.players.sort((a, b) => b.rating - a.rating);
        const midpoint = Math.floor(this.players.length / 2);
        const pairings = [];
        for (let i = 0; i < midpoint; i++) {
            pairings.push({
                white: this.players[i],
                black: this.players[i + midpoint],
                round: 1
            });
        }
        if (this.players.length % 2 !== 0) {
            pairings.push({
                white: this.players[this.players.length - 1],
                black: null,
                round: 1
            });
        }
        this.currentRound = 1;
        this.pairings = pairings;
        return pairings;
    }

    getPreferredColor(player) {
        const colorCount = player.colorHistory.reduce((acc, color) => {
            acc[color]++;
            return acc;
        }, { white: 0, black: 0 });
        if (colorCount.white < colorCount.black) return 'white';
        if (colorCount.black < colorCount.white) return 'black';
        return player.colorHistory[player.colorHistory.length - 1] === 'white' ? 'black' : 'white';
    }

    canBePaired(player1, player2) {
        if (player1.opponents.includes(player2.id)) return false;
        const p1Preferred = this.getPreferredColor(player1);
        const p2Preferred = this.getPreferredColor(player2);
        return p1Preferred !== p2Preferred || player1.colorHistory.length === 0;
    }

    nextRound() {
        this.currentRound++;
        const scoreGroups = new Map();
        this.players.forEach(player => {
            const score = player.score;
            if (!scoreGroups.has(score)) {
                scoreGroups.set(score, []);
            }
            scoreGroups.get(score).push(player);
        });
        const pairings = [];
        const unpaired = [];
        const sortedScores = Array.from(scoreGroups.keys()).sort((a, b) => b - a);
        for (const score of sortedScores) {
            let players = scoreGroups.get(score);
            while (players.length > 1) {
                let paired = false;
                const p1 = players[0];
                for (let i = 1; i < players.length; i++) {
                    const p2 = players[i];
                    if (this.canBePaired(p1, p2)) {
                        const p1Preferred = this.getPreferredColor(p1);
                        pairings.push({
                            white: p1Preferred === 'white' ? p1 : p2,
                            black: p1Preferred === 'white' ? p2 : p1,
                            round: this.currentRound
                        });
                        players = players.filter(p => p !== p1 && p !== p2);
                        paired = true;
                        break;
                    }
                }
                if (!paired) {
                    unpaired.push(p1);
                    players.shift();
                }
            }
            if (players.length === 1) {
                unpaired.push(players[0]);
            }
        }
        while (unpaired.length > 1) {
            const p1 = unpaired.shift();
            const p2 = unpaired.shift();
            pairings.push({
                white: this.getPreferredColor(p1) === 'white' ? p1 : p2,
                black: this.getPreferredColor(p1) === 'white' ? p2 : p1,
                round: this.currentRound
            });
        }
        if (unpaired.length === 1) {
            pairings.push({
                white: unpaired[0],
                black: null,
                round: this.currentRound
            });
        }
        this.pairings = pairings;
        return pairings;
    }

    recordResult(pairing, result) {
        const { white, black } = pairing;
        if (!black) {
            white.score += 1;
            return;
        }
        switch(result) {
            case '1-0':
                white.score += 1;
                break;
            case '0-1':
                black.score += 1;
                break;
            case '½-½':
                white.score += 0.5;
                black.score += 0.5;
                break;
        }
        white.opponents.push(black.id);
        black.opponents.push(white.id);
        white.colorHistory.push('white');
        black.colorHistory.push('black');
    }

    getFinalStandings() {
        return this.players
            .map(player => ({
                ...player,
                buchholz: this.calculateBuchholz(player),
                sonnebornBerger: this.calculateSonnebornBerger(player)
            }))
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
                return b.sonnebornBerger - a.sonnebornBerger;
            });
    }

    calculateBuchholz(player) {
        return player.opponents.reduce((sum, opponentId) => {
            const opponent = this.players.find(p => p.id === opponentId);
            return sum + (opponent ? opponent.score : 0);
        }, 0);
    }

    calculateSonnebornBerger(player) {
        return player.opponents.reduce((sum, opponentId) => {
            const opponent = this.players.find(p => p.id === opponentId);
            const pairing = this.pairings.find(p =>
                (p.white.id === player.id && p.black && p.black.id === opponentId) ||
                (p.black && p.black.id === player.id && p.white.id === opponentId)
            );
            if (pairing) {
                if ((pairing.white.id === player.id && pairing.result === '1-0') ||
                    (pairing.black && pairing.black.id === player.id && pairing.result === '0-1')) {
                    return sum + (opponent ? opponent.score : 0);
                } else if (pairing.result === '½-½') {
                    return sum + ((opponent ? opponent.score : 0) / 2);
                }
            }
            return sum;
        }, 0);
    }
}

module.exports = SwissTournament;

