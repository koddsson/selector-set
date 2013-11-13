(function() {
  'use strict';

  function random() {
    return Math.floor(Math.random() * 1e+10);
  }

  function createElementMatchingSelector(selectors) {
    var selector = selectors[0];
    if (!selector) {
      return;
    }

    var m, el;
    if (m = selector.match(/^#(\w+)$/)) {
      el = document.createElement('div');
      el.id = m[1];
    } else if (m = selector.match(/^\.(\w+)$/)) {
      el = document.createElement('div');
      el.className = m[1];
    } else if (m = selector.match(/^(\w+)$/)) {
      el = document.createElement(m[1]);
    }

    if (!SelectorSet.prototype.matchesSelector(el, selector)) {
      throw 'couldn\'t make element matching "' + selector + '"';
    }

    return el;
  }


  var implementations = [ SelectorSet, ExemplarSelectorSet ];


  function fillSelectorSets(randSelector) {
    return function(n) {
      var i, len = implementations.length, sets = [];
      for (i = 0; i < len; i++) {
        sets[i] = new implementations[i]();
      }
      while (n--) {
        var selector = randSelector();
        for (i = 0; i < len; i++) {
          sets[i].add(selector);
        }
      }
      return sets;
    };
  }

  var range = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 25];

  var benchmarks = [
    {
      name: 'match - id',
      selector: function() { return '#rand' + random(); }
    },
    {
      name: 'match - class',
      selector: function() { return '.rand' + random(); }
    },
    {
      name: 'match - tag',
      selector: function() { return 'rand' + random(); }
    },
    {
      name: 'match - id/class',
      selector: function() {
        if (Math.random() < 0.5) {
          return '#rand' + random();
        } else {
          return '.rand' + random();
        }
      }
    }
  ];


  function benchmark(benchmarks) {
    var suite = new Benchmark.Suite();

    if (!benchmarks.length) {
      benchmarks = [benchmarks];
    }

    function runSelectorSetMatch(set, el) {
      return function run() {
        set.matches(el);
      };
    }

    for (var b = 0; b < benchmarks.length; b++) {
      var benchOpts = benchmarks[b];

      for (var i = 0; i < range.length; i++) {
        var size = range[i];
        var sets = fillSelectorSets(benchOpts.selector)(size);
        var el = createElementMatchingSelector(sets[0].selectors);

        for (var j = 0; j < sets.length; j++) {
          var set = sets[j];
          var groupName = benchOpts.name + set.constructor.name + '#matches';
          var run = runSelectorSetMatch(set, el);
          var bench = new Benchmark(groupName + size, run, {
            async: true,
            maxTime: 0.1
          });
          bench.set = set;
          bench.groupName = groupName;

          suite.push(bench);
        }
      }
    }

    return suite;
  }


  function graph(root) {
    var margin = {top: 10, right: 10, bottom: 20, left: 30},
        width = root.width.baseVal.value - margin.left - margin.right,
        height = root.height.baseVal.value - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    function domain(data, fn) {
      return [
        d3.min(data, function(d) { return d3.min(d.values, fn); }),
        d3.max(data, function(d) { return d3.max(d.values, fn); })
      ];
    }

    var color = d3.scale.category10();
    function stroke(d) {
      return color(d.key);
    }

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom');

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left');

    var nest = d3.nest()
                 .key(function(d) { return d.groupName; });

    function xValue(bench) {
      return bench.set.selectors.length;
    }
    function yValue(bench) {
      return bench.stats.mean * 1000 * 1000;
    }

    var line = d3.svg.line()
        .interpolate('basis')
        .x(function(d) { return x(xValue(d)); })
        .y(function(d) { return y(yValue(d)); });

    var svg = d3.select(root)
      .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0, ' + height + ')')
        .call(xAxis);

    svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis)
      .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 6)
        .attr('dy', '.71em')
        .style('text-anchor', 'end')
        .text('μs');


    function redraw(suite) {
      var data = nest.entries(suite);

      x.domain(domain(data, xValue));
      svg.select('.x.axis').transition().call(xAxis);

      y.domain(domain(data, yValue));
      svg.select('.y.axis').transition().call(yAxis);

      var l = svg.selectAll('.line')
          .data(data);

      l.enter().append('path')
        .attr('class', 'line')
        .style('stroke', stroke);

      l.exit()
        .remove();

      l.transition()
        .attr('d', function(d) { return line(d.values); });
    }

    return redraw;
  }

  window.perf = {
    benchmarks: benchmarks,
    graph: graph,
    benchmark: benchmark
  };
})();
