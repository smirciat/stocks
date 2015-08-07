'use strict';

angular.module('workspaceApp')
  .controller('MainCtrl', function ($scope, $http, $q, socket) {
    $scope.dateFormat = function(dateString){//input yyyy-mm-dd, output mmm dd, yyyy
      if (dateString===undefined||dateString=='') return '';
      var year = parseInt(dateString.substr(0,4));
      var month = parseInt(dateString.substr(5,2));
      var day = parseInt(dateString.substr(8));
      var months=['','Jan','Feb','Mar','Apr','May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];
      return months[month] + ' ' + day + ', ' + year;
    };
    $scope.awesomeThings = [];
    $scope.data=[[]];
    $scope.labels=[];
    $scope.options={bezierCurve : false,
                    pointHitDetectionRadius : 0,
                    datasetFill : false
    };
    $scope.series=[];
    $http.get('/api/things').success(function(awesomeThings) {
      $scope.awesomeThings = awesomeThings;
      socket.syncUpdates('thing', $scope.awesomeThings, function(event, item, array){
        $scope.drawChart(array);
      });
      $scope.drawChart(awesomeThings);
    });
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!
    var om = mm-6;
    if (om<1) om=1;
    var yyyy = today.getFullYear();
    if(dd<10){
        dd='0'+dd
    } 
    if(mm<10){
        mm='0'+mm
    } 
    if(om<10){
        om='0'+om
    } 
    var date2 = yyyy + '-' + mm + '-' + dd;
    var date1=yyyy + '-' + om + '-' + dd;
    var baseUrl='https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.historicaldata%20where%20symbol%20%3D%20%22';
    var base2='%22%20and%20startDate%20%3D%20%22' + date1 + '%22%20and%20endDate%20%3D%20%22' + date2 + '%22&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=JSON_CALLBACK';
    $scope.getQuotes = function(symbol, callback){
      return $http.jsonp(baseUrl + symbol + base2).success(function(data){
        return callback(data.query.results.quote);
      });
    };
    $scope.drawChart=function(tickers){
      $scope.series=[];
      $scope.data=[[]];
      $scope.labels=[];
      var promises=[];
      tickers.forEach(function(ticker, index){
        promises.push($scope.getQuotes(ticker.symbol, function(array){
          $scope.series.push(array[0].Symbol);
          var tempData=[];
          array.forEach(function(element){
            //if ($scope.data.length===index) $scope.data.push([]);
            tempData.push(element.Close);
            if (index===0) $scope.labels.push($scope.dateFormat(element.Date));
          });
          tempData.reverse();
          $scope.data.push(tempData);
          if ($scope.data[0].length===0) $scope.data.splice(0,1);
          if (index===0) $scope.labels.reverse();
        }));
      });
      $q.all(promises).then(function () {
        console.log('All Done!');
      });
    };
    $scope.addThing = function() {
      if($scope.newThing === '') {
        return;
      }
      $http.post('/api/things', { symbol: $scope.newThing });
      $scope.newThing = '';
    };

    $scope.deleteThing = function(thing) {
      $http.delete('/api/things/' + thing._id);
    };

    $scope.$on('$destroy', function () {
      socket.unsyncUpdates('thing');
    });
  });
