const csv = require("jquery-csv");
const fs = require("fs");

const express = require("express");
const app = express();
const PORT = 3000;

// express

app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: false }))

app.get("/", (req, res) => {
    res.send("index.html");
});

app.post("/pronounce", (req, res) => {
    try {
        res.redirect("/?ipa=" + misprounounceString(req.body.toPronounce));
    } catch (e) {
        res.redirect("/?error=true");
    }
})

// stuff that does things
const lettersToPhonemes = JSON.parse(fs.readFileSync("letters_to_phonemes.json"));
let data = fs.readFileSync("englishtoipa.csv", "utf-8");
const englishToIpa = csv.toArrays(data);

const englishWords = englishToIpa.map(a => a[0]);
const transcriptions = englishToIpa.map(a => a[1]);

function generateIncorrectPhoneme(letterPairing, valid) {
    let validPhonemes = lettersToPhonemes[letterPairing];

    // unfortunately, if we can't make a wrong sound, we are forced to make the right one
    if (validPhonemes.length === 1) {
        return valid || validPhonemes[0];
    }

    let randomIndex = Math.floor(Math.random() * validPhonemes.length);
    if (validPhonemes[randomIndex] === valid) {
        return generateIncorrectPhoneme(letterPairing, valid); // lazy recursive call instead of actually smart looping
    }
    return validPhonemes[randomIndex];

}

function misprounounceString(input) {
    input = input.replaceAll(/,|:|`|;|\./g, "");
    input = input.toLowerCase();
    let words = input.split(" ");
    let out = "";
    for (let word of words) {
        let transcription = transcriptions[englishWords.findIndex((str) => word === str)];

        word = word.replaceAll(/'|-/g, "");
        // handle case where word's transcription is not in dataset
        if (!transcription) {
            for (let letter of word) {
                out += generateIncorrectPhoneme(letter, "");
            }
            out += " ";
            continue;
        }
        let wordIndex = 0; // index of word
        let symbolIndex = 0;
        // map all sounds in word to their corresponding letter representations
        while (symbolIndex < transcription.length && wordIndex < word.length) {
            let nextLetterGroup = word.substring(wordIndex);
            let phonemeValue;
getPhoneme: while (!phonemeValue) {
                // find next letter group
                while (!(Object.keys(lettersToPhonemes).includes(nextLetterGroup))) {
                    nextLetterGroup = nextLetterGroup.substring(0,nextLetterGroup.length-1);
                    if (!nextLetterGroup) {
                        break getPhoneme;
                    }
                }
                
                // find that letter group's corresponding phoneme value, if it does not exist, continue on to next possibility
                phonemeValue = lettersToPhonemes[nextLetterGroup].map(candidate => {
                    if (transcription.substring(symbolIndex).startsWith(candidate)) {
                        return candidate;
                    }
                }).filter(a => a)[0];

                // if the letter group is invalid, force it to do the next one (inefficient, bad code but i'm tired)
                if (!phonemeValue) {
                    if (nextLetterGroup.length === 1) {
                        out += generateIncorrectPhoneme(nextLetterGroup, "");
                    }
                    nextLetterGroup = nextLetterGroup.substring(0,nextLetterGroup.length-1);
                }

            }
            // generate new phoneme that that letter could represent but not one that is correct

            // potentially split letter groups into component parts (20% chance to split)
            if (nextLetterGroup)
            if (nextLetterGroup.length > 1 && Math.random() < 0.2) {
                for (let splitIndex = 0; splitIndex < nextLetterGroup.length; splitIndex++) {
                    let splittedGroup = [nextLetterGroup.substring(0, splitIndex), nextLetterGroup.substring(splitIndex)];
                    let keys = Object.keys(lettersToPhonemes);
                    if (keys.includes(splittedGroup[0]) && keys.includes(splittedGroup[1])) {
                        out += generateIncorrectPhoneme(splittedGroup[0], "");
                        out += generateIncorrectPhoneme(splittedGroup[1], "");
                    }
                }
            } else {
                // don't split
                out += generateIncorrectPhoneme(nextLetterGroup, phonemeValue);
            }

            symbolIndex += phonemeValue?.length || 1;
            wordIndex += nextLetterGroup.length || 1;
        }
        // add missing letters
        while (wordIndex < word.length) {
            out += generateIncorrectPhoneme(word[wordIndex], "");
            wordIndex++;
        }
        out += " ";
    }
    return out;
}


// it hears
app.listen(PORT, ()=>{});