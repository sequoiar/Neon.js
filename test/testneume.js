(function() {
    module("Neume");

    // staff bounding box
    // <zone lry="406" lrx="1450" xml:id="m-0ac66c2a-bebd-493a-94bc-cfa2a0ba0489" uly="302" ulx="190"/>
    var sbb = [190,302,1450,406];

    // neume bounding box
    // <zone lry="376" lrx="315" xml:id="m-b06676a3-4aa1-430d-b1c8-3d3fcf606f0e" uly="326" ulx="265"/>
    var nbb = [265,326,315,376];

    // MEI neume: torculus
    var nMEI = '<neume xml:id="m-0a4bc023-a021-41e8-b604-0faeca819b5e" facs="m-59ed0a4d-7284-4404-aa49-b42b93678344" name="torculus"><nc xml:id="m-65b136c1-baf9-4b77-9f55-a4f5e2bbd7c9"><note xml:id="m-e5ba967b-12cf-435c-a4cc-f0da89f6be11" pname="f" oct="3"/><note xml:id="m-48a1cf1c-0e8f-4c48-9cec-a07f4d36fa7b" pname="g" oct="3"/><note xml:id="m-a2703729-135f-48c5-9908-f27feaf83313" pname="f" oct="3"/></nc></neume>';

    var nMEIfacs = '<zone lry="383" lrx="668" xml:id="m-59ed0a4d-7284-4404-aa49-b42b93678344" uly="345" ulx="617"/>';

    test("Constructor", function() {
        // test default constructor properties
        var nModel = new Toe.Model.Neume();
    
        equal(nModel.props.key, "punctum");
        deepEqual(nModel.props.type, Toe.Model.Neume.Type.punctum);
        ok(!nModel.props.modifier);
        ok(nModel.props.interact);

        // test constructor with specified neume properties
        nModel = new Toe.Model.Neume({key: "torculus", interact: false});

        equal(nModel.props.key, "torculus");
        deepEqual(nModel.props.type, Toe.Model.Neume.Type.torculus);
        ok(!nModel.props.modifier);
        ok(!nModel.props.interact);

        // test creation of unknown neume 
        // these are called compound neumes in the model
        nModel = new Toe.Model.Neume({key: "myNeume"});

        equal(nModel.props.key, "compound");
        deepEqual(nModel.props.type, Toe.Model.Neume.Type.compound);
    });

    test("Set Bounding Box", function() {
        var nModel = new Toe.Model.Neume();

        // test invalid bounding box argument
        raises(function() { 
            nModel.setBoundingBox([234,23,0,0]);
        });

        nModel.setBoundingBox(nbb);
        equal(nModel.zone.ulx, nbb[0]);
        equal(nModel.zone.uly, nbb[1]);
        equal(nModel.zone.lrx, nbb[2]);
        equal(nModel.zone.lry, nbb[3]);
    });

    test("Neume from MEI", function() {
        var sModel = new Toe.Model.Staff(sbb);
        var cModel = new Toe.Model.Clef("c");
        sModel.setClef(cModel);

        var nModel = new Toe.Model.Neume();
        nModel.neumeFromMei($(nMEI)[0], $(nMEIfacs), sModel);

        equal(nModel.props.key, "torculus");
        deepEqual(nModel.props.type, Toe.Model.Neume.Type.torculus);
        
        equal(nModel.zone.ulx, 617);
        equal(nModel.zone.uly, 345);
        equal(nModel.zone.lrx, 668);
        equal(nModel.zone.lry, 383);

        var rootPitchInfo = nModel.getRootPitchInfo();
        equal(rootPitchInfo["pname"], "f");
        equal(rootPitchInfo["oct"], 3);
        
        equal(nModel.components.length, 3);
        ncTypes = new Array();
        for (var i = 0; i < nModel.components.length; i++) {
            ncTypes.push(nModel.components[i].props.type);
        }
        deepEqual(ncTypes, ["punctum", "punctum", "punctum"]);

        sModel.addNeume(nModel);

        equal(nModel.rootDiff, -4);
    });

    // also tests get neume component differences
    test("Add Neume Components", function() {
        var sModel = new Toe.Model.Staff(sbb);
        var cModel = new Toe.Model.Clef("c");
        sModel.setClef(cModel);

        var nModel = new Toe.Model.Neume({type: "climacus"});
        
        var diffs = [0, -1, -2];
        nModel.addComponent("punctum", "c", 4);
        nModel.addComponent("inclinatum", "a", 3);

        // add a component in the middle
        nModel.addComponent("inclinatum", "b", 3, {ncInd: 1});

        // add this neume to the staff
        sModel.addNeume(nModel);

        deepEqual(nModel.getDifferences(), diffs);
    });

    /* TODO: update these
    test("Differences to Melodic Movement", function() {
        // first generate random diffs from melodic movements in the dictionary
        // for each neume in the dictionary
        for(var nKey in Toe.Model.Neume.Type) {
            var nModel = new Toe.Model.Neume();

            var nType = Toe.Model.Neume.Type[nKey];
	        var melody = nType.melodicMove;
    
            var prevDiff = 0;
            var diffs = $.map(melody, function(el, ind) {
                // generate random interval dispersion within the octave
                var min = 0;
                var max = 0;
                if (el == 1) {
                    min = prevDiff + 1;
                    max = prevDiff + 7;
                }
                else if (el == -1) {
                    max = prevDiff - 1;
                    min = prevDiff - 7;
                }

                var interval = Math.abs(Math.floor(Math.random() * (max - min + 1)) + min);
                var diff = interval * el;
                prevDiff = diff;

                return diff;
            });

            // fill the neume with the appropriate components
            for (var cInd = 0; cInd < diffs.length; cInd++) {
                nModel.addComponent("punctum", diffs[cInd]);
            }

            deepEqual(nModel.getDifferences(), diffs);

            // now see if the melodic movement is reconstructed correctly
            deepEqual(nModel.diffToMelodicMove(), melody);
        }
    });

    
    test("Derive Neume Name", function() {
        // for each neume in the dictionary
        for(var nKey in Toe.Model.Neume.Type) {
            if (nKey == "compound") {
                continue;
            }

            var nModel = new Toe.Model.Neume();

            var nType = Toe.Model.Neume.Type[nKey];
	        var melody = nType.melodicMove;

            var prevDiff = 0;
            var diffs = $.map(melody, function(el, ind) {
                // generate random interval dispersion within the octave
                var min = 0;
                var max = 0;
                if (el == 1) {
                    min = prevDiff + 1;
                    max = prevDiff + 7;
                }
                else if (el == -1) {
                    max = prevDiff - 1;
                    min = prevDiff - 7;
                }

                var interval = Math.abs(Math.floor(Math.random() * (max - min + 1)) + min);
                var diff = interval * el;
                prevDiff = diff;

                return diff;
            });

            // fill the neume with the appropriate components
            for (var cInd = 0; cInd < diffs.length; cInd++) {
                nModel.addComponent("punctum", diffs[cInd]);
            }

            deepEqual(nModel.getDifferences(), diffs);

            equal(nModel.deriveName(), nType.name);
        }
    });*/
})();
