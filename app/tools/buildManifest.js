rerum.config(['$routeProvider',
    function ($routeProvider, $locationProvider, Edition) {
        $routeProvider
            .when('/build', {
                templateUrl: 'app/tools/buildManifest.html',
                controller: 'buildManifestController',
                resolve: {
                    context: function (Context) {
                        return Context.getJSON.success(function (c) {
                            // cached for later consumption
                        });
                    }
                }
            });
    }]);

rerum.service('Context', function ($http, $q) {
    var self = this;
    var url = 'http://iiif.io/api/presentation/2/context.json';
    this.getJSON = $http.get(url, {cache: true}).success(function (c) {
        self.json = c['@context'][0];
    });
});
rerum.value('Knowns',{
    obj : {
        "@id": "new (save to mint a new URI)",
        "@context": "http://iiif.io/api/presentation/2/context.json",
        "@type": "sc:Manifest",
        "label": "",
        "resources": [],
        "metadata":[],
        "sequences": [{
                "@id": "normal sequence",
                "@type": "sc:Sequence",
                "canvases": []
            }]
    },
    types : ['number', 'string', 'memo', 'list', 'object'],
    adding : {
        sequences: {
            item: 'sequences',
            single: 'sequence',
            init: {
                '@id':"",
                '@type':"sc:Sequence",
                label:"unlabeled",
                viewingDirection:"left-to-right",
                viewingHint:"paged",
                canvases:[]
            }
        },
        resources: {
            item: 'resources',
            single: 'resource',
            init: {
                '@id':"",
                '@type':"oa:Annotation",
                motivation:"",
                on:""
            },
            build: function(item,parent){
                item.on = parent['@id'];
                return item;
            }
        },
        collections: {},
        manifests: {},
        canvases: {
            item: 'canvases',
            single: 'canvas',
            init: {
                '@id':"",
                '@type':"sc:Canvas",
                label:"",
                height:undefined,
                width:undefined,
                images:[]
            }
        },
        images: {
            item: 'image annotations',
            single: 'image annotation',
            init: {
                '@id':"",
                '@type':"oa:Annotation",
                motivation:"sc:painting",
                resource:{
                    '@id':"",
                    '@type':"dctypes:Image",
                    format:"unknown",
                    service:{},
                    height:undefined,
                    width:undefined
                },
                on:""
            },
            build: function(item,parent){
                item.on = parent['@id'];
                return item;
            }
        },
        otherContent: {
            item: 'lists',
            single: 'list',
            init: {
                '@id':"",
                '@type':"sc:AnnotationList",
                label:"",
                resources:[]
            }
        },
        structures: {
            item: 'structures',
            single: 'structure',
            init: {
                '@id':"",
                '@type':"sc:Range",
                label:"",
                canvases:[]
            }
        },
        ranges: {
            item: 'ranges',
            single: 'range',
            init: {
                '@id':"",
                '@type':"sc:Range",
                label:"",
                canvases:[],
                within:""
            }
        },
        metadata: {
            item: 'metadata pairs',
            single: 'metadata pair',
            init: {
                label:"",
                '@value':""
            }
        }
    }
});
rerum.controller('buildManifestController', function ($scope, $modal, Context, Knowns) {
    Context.getJSON.success(function (c) {
        $scope.context = c['@context'][0];
    });
    $scope.obj = Knowns.obj;
    $scope.types = Knowns.type;
    $scope.adding = Knowns.adding;

    $scope.editList = function (parent,prop) {
        var self = this;
        var modal = $modal.open({
            templateUrl: 'app/tools/editList.html',
            size: 'lg',
            controller: function ($scope,Knowns,Context) {
                $scope.context = Context.json;
                $scope.list = parent[prop];
                $scope.parent = parent;
                $scope.prop = prop;
                $scope.adding = Knowns.adding;
                $scope.editList = self.editList; // what strange scope hath I wrought?
                $scope.addItem = function(item,parent,list,build){
                    var newItem = angular.copy(item) || {};
                    if(build){
                        build(newItem,parent);
                    }
                    list.push(newItem);
                };
            }
        });
    };
});

rerum.directive('addProperty',function(){
    return {
        restrict: 'E',
        templateUrl:'app/tools/addProperty.html',
        scope: {
            obj:'='
        },
        controller: function($scope,Knowns){
            $scope.types = Knowns.types;
            $scope.newProp = "";
            $scope.newType = "string";
            $scope.addProp = function(prop,type){
                if(!$scope.obj.hasOwnProperty(prop)){
                    $scope.obj[prop]={
                        '@type':type,
                        '@value':undefined
                    };
                }
                $scope.newProp = "";
                $scope.newType = "string";
            };
        }
    };
});
rerum.directive('property', function ($compile) {
    var getTemplate = function (type) {
        var tmpl = ['<div class="form-group">'
                + '<label class="{{labelClass}}" title="{{context[is][\'@id\']||context[is]}}"><span ng-show="context[is]">'
                + '<i class="fa fa-check"></i></span> {{is}}:</label>',
            null,
            '</div>'];
        var input;
        switch (type) {
            case 'number' :
            case 'xsd:integer' :
                input = '<input type="number" min=0 step=1 ng-pattern="\'\d+\'" ng-model="for[is]">';
                break;
            case 'object' :
                input = '<ul ng-show="for[is].length"><li ng-repeat="(k,v) in for[is]" ng-show="angular.isDefined(k)">'
                    + '<property for="for[is]" is="k"></property></li></ul>';
                break;
            case 'memo' :
                input = '<textarea ng-model="for[is]"></textarea>';
                break;
            case 'pairs' : 
                input = '<button class="btn btn-xs btn-default" type="button" ng-click="editList(for,is)">'
                    + '<i class="fa fa-list-ol"></i> edit</button>'
                    + '<dl class="dl-horizontal"><dt title="{{item.label}}" ng-repeat-start="item in for[is]">{{item.label}}</dt>'
                    + '<dd ng-repeat-end>{{item["@value"]}}</dd></dl>';
                break;
            case '@list' :
            case 'list'  :
                input = '<button class="btn btn-xs btn-default" type="button" ng-click="editList(for,is)">'
                    + '<i class="fa fa-list-ol"></i> edit</button>'
                    + '<ol ng-show="for[is].length"><li ng-repeat="item in for[is]">{{item["@id"]||item}}</li></ol>';
                break;
            case 'image' :
                input = '[image placeholder]';
                break;
            case 'sound' :
                input = '[sound placeholder]';
                break;
            case 'video' :
                input = '[video placeholder]';
                break;
            case 'string' :
                input = '<input type="text" ng-model="for[is]">';
                break;
                // or display only
            default :
                input = '<span class="text-overflow">{{for[is]}}</span>'
        }
        ;
        tmpl[1] = '<div class="positioned">' + input + '<i></i></div>';
        return tmpl.join('');
    };
    var props = {
        "rdfs:label": 'string',
        'label': 'string',
        "dc:description": 'memo',
        'sc:Sequence': 'object',
        'sc:Canvas': 'object',
        '@id': 'string',
        '@type': 'string',
        '@value':'string',
        '@list': '@list',
        'xsd:integer': 'number',
        'exif:height': 'number',
        'exif:width': 'number',
    };

    var linker = function (scope, el, attrs) {
        var type = (scope.types.indexOf(scope.for[scope.is]&&scope.for[scope.is]['@type'])>-1) && scope.for[scope.is]['@type']
            || (scope.context[scope.is] && scope.context[scope.is]['@container'])
            || (scope.context[scope.is] && scope.context[scope.is]['@type'])
            || (scope.context[scope.for[scope.is]] && scope.context[scope.for[scope.is]]['@type'])
            || props[scope.is]
            || 'unknown';
            if(type.indexOf('list')>-1){
                scope.$watchCollection('for[is]',function(newVal,oldVal){
                    if(newVal && newVal.length){
                        // maybe just a k-v pair setup, like metadata
                        if (angular.isDefined(scope.for[scope.is].length 
                            && !scope.for[scope.is][0]['@id']
                            && scope.for[scope.is][0].label
                            && scope.for[scope.is][0]['@value'])) {
                            type = "pairs";
                        }
                        el.html(getTemplate(type));
                        $compile(el.contents())(scope);
                    }
                });
            }
        scope.labelClass = attrs.labelClass;
        el.html(getTemplate(type)); //.show();
        $compile(el.contents())(scope);
    };
    return {
        restrict: 'E',
        link: linker,
        scope: {
            is: '=',
            for : '='
        },
        controller: function ($scope, Context, Knowns) {
            $scope.types = Knowns.types;
            $scope.context = Context.json || Context.getJSON.success(function (c) {
                $scope.context = c['@context'][0];
            });
            if (!$scope.editList) {
                $scope.editList = $scope.$parent.editList;
            }
        }
    };
});