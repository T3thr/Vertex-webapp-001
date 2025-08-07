// src/app/novels/[slug]/overview/components/unified/simulator/VariableStateSimulator.tsx
"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Sliders, 
  ToggleLeft, 
  ToggleRight,
  Hash,
  Type,
  Calendar,
  List,
  Package,
  Heart,
  Users,
  Zap,
  RefreshCw,
  Save,
  Download,
  Upload,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  X,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

// Types
import { UnifiedState } from '../UnifiedStorytellingEnvironment';

interface VariableStateSimulatorProps {
  environmentData: {
    novel: any;
    episodes: any[];
    storyMap: any | null;
    characters: any[];
    scenes: any[];
    userMedia: any[];
    officialMedia: any[];
  };
  unifiedState: UnifiedState;
  onVariableChange: (variableName: string, value: any) => void;
}

interface SimulatedVariable {
  id: string;
  name: string;
  dataType: 'boolean' | 'number' | 'string' | 'character_status' | 'relationship_level' | 'datetime' | 'array' | 'object';
  value: any;
  initialValue: any;
  description?: string;
  scope: 'scene' | 'episode' | 'novel_global' | 'player_profile';
  isVisibleToPlayer: boolean;
  hasChanged: boolean;
  category: 'story' | 'character' | 'relationship' | 'inventory' | 'achievement' | 'system';
}

interface CharacterRelationship {
  characterId: string;
  characterName: string;
  relationshipLevel: number;
  relationshipType: string;
  lastInteraction?: Date;
}

interface ConditionalRule {
  id: string;
  condition: string;
  description: string;
  isActive: boolean;
  affectedElements: string[];
}

const VariableStateSimulator: React.FC<VariableStateSimulatorProps> = ({
  environmentData,
  unifiedState,
  onVariableChange
}) => {
  const { storyMap, novel, scenes, characters } = environmentData;
  
  // Simulator state
  const [simulatedVariables, setSimulatedVariables] = useState<SimulatedVariable[]>([]);
  const [characterRelationships, setCharacterRelationships] = useState<CharacterRelationship[]>([]);
  const [conditionalRules, setConditionalRules] = useState<ConditionalRule[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'story' | 'character' | 'relationship' | 'inventory'>('all');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['variables', 'relationships']));
  const [isLivePreview, setIsLivePreview] = useState(true);
  const [simulationPresets, setSimulationPresets] = useState<Array<{
    name: string;
    description: string;
    variables: Record<string, any>;
  }>>([]);

  // Initialize variables from StoryMap
  useEffect(() => {
    if (!storyMap?.storyVariables) return;

    const variables: SimulatedVariable[] = storyMap.storyVariables.map((variable: any) => ({
      id: variable.variableId,
      name: variable.variableName,
      dataType: variable.dataType,
      value: variable.initialValue,
      initialValue: variable.initialValue,
      description: variable.description,
      scope: variable.isGlobal ? 'novel_global' : 'scene',
      isVisibleToPlayer: variable.isVisibleToPlayer || false,
      hasChanged: false,
      category: determineVariableCategory(variable.variableName, variable.dataType)
    }));

    setSimulatedVariables(variables);
  }, [storyMap]);

  // Initialize character relationships
  useEffect(() => {
    if (!characters) return;

    const relationships: CharacterRelationship[] = characters.map((character: any) => ({
      characterId: character._id,
      characterName: character.name || `Character ${character._id}`,
      relationshipLevel: 0,
      relationshipType: 'neutral',
      lastInteraction: undefined
    }));

    setCharacterRelationships(relationships);
  }, [characters]);

  // Initialize conditional rules from current scene
  useEffect(() => {
    if (!unifiedState.selectedSceneId || !scenes) return;

    const currentScene = scenes.find((scene: any) => scene._id === unifiedState.selectedSceneId);
    if (!currentScene) return;

    const rules: ConditionalRule[] = [];
    
    // Extract conditional rules from choices and elements
    currentScene.choiceGroupsAvailable?.forEach((choiceGroup: any, index: number) => {
      if (choiceGroup.displayCondition) {
        rules.push({
          id: `choice-condition-${index}`,
          condition: typeof choiceGroup.displayCondition === 'string' 
            ? choiceGroup.displayCondition 
            : JSON.stringify(choiceGroup.displayCondition),
          description: `Choice group visibility condition`,
          isActive: false,
          affectedElements: [choiceGroup.instanceId]
        });
      }
    });

    // Extract conditions from timeline events
    currentScene.timelineTracks?.forEach((track: any) => {
      track.events?.forEach((event: any, eventIndex: number) => {
        if (event.parameters?.conditionToExecute) {
          rules.push({
            id: `event-condition-${track.trackId}-${eventIndex}`,
            condition: event.parameters.conditionToExecute,
            description: `Timeline event condition: ${event.eventType}`,
            isActive: false,
            affectedElements: [event.targetInstanceId]
          });
        }
      });
    });

    setConditionalRules(rules);
  }, [unifiedState.selectedSceneId, scenes]);

  // Determine variable category based on name and type
  const determineVariableCategory = (name: string, dataType: string): SimulatedVariable['category'] => {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('relationship') || dataType === 'relationship_level') return 'relationship';
    if (lowerName.includes('character') || lowerName.includes('status')) return 'character';
    if (lowerName.includes('inventory') || lowerName.includes('item')) return 'inventory';
    if (lowerName.includes('achievement') || lowerName.includes('unlock')) return 'achievement';
    if (lowerName.includes('system') || lowerName.includes('debug')) return 'system';
    
    return 'story';
  };

  // Handle variable value change
  const handleVariableChange = useCallback((variableId: string, newValue: any) => {
    setSimulatedVariables(prev => 
      prev.map(variable => 
        variable.id === variableId 
          ? { ...variable, value: newValue, hasChanged: newValue !== variable.initialValue }
          : variable
      )
    );

    const variable = simulatedVariables.find(v => v.id === variableId);
    if (variable) {
      onVariableChange(variable.name, newValue);
      
      // Update conditional rules
      if (isLivePreview) {
        updateConditionalRules();
      }
    }
  }, [simulatedVariables, onVariableChange, isLivePreview]);

  // Handle relationship change
  const handleRelationshipChange = useCallback((characterId: string, level: number) => {
    setCharacterRelationships(prev =>
      prev.map(rel =>
        rel.characterId === characterId
          ? { 
              ...rel, 
              relationshipLevel: level,
              relationshipType: level > 70 ? 'love' : level > 40 ? 'friend' : level < -40 ? 'enemy' : 'neutral',
              lastInteraction: new Date()
            }
          : rel
      )
    );

    // Update corresponding relationship variables
    const relationshipVar = simulatedVariables.find(v => 
      v.name.includes('relationship') && v.name.includes(characterId)
    );
    if (relationshipVar) {
      handleVariableChange(relationshipVar.id, level);
    }
  }, [simulatedVariables, handleVariableChange]);

  // Update conditional rules based on current variable values
  const updateConditionalRules = useCallback(() => {
    setConditionalRules(prev =>
      prev.map(rule => {
        try {
          // Simple evaluation - in a real implementation, use a proper expression evaluator
          const isActive = evaluateCondition(rule.condition, simulatedVariables);
          return { ...rule, isActive };
        } catch (error) {
          console.error('Error evaluating condition:', rule.condition, error);
          return { ...rule, isActive: false };
        }
      })
    );
  }, [simulatedVariables]);

  // Simple condition evaluator (for demo purposes)
  const evaluateCondition = (condition: string, variables: SimulatedVariable[]): boolean => {
    // This is a simplified evaluator. In production, use a proper expression parser.
    const variableMap = variables.reduce((acc, variable) => {
      acc[variable.name] = variable.value;
      return acc;
    }, {} as Record<string, any>);

    try {
      // Replace variable names with their values
      let evaluableCondition = condition;
      Object.entries(variableMap).forEach(([name, value]) => {
        const regex = new RegExp(`\\b${name}\\b`, 'g');
        evaluableCondition = evaluableCondition.replace(regex, JSON.stringify(value));
      });

      // Use Function constructor for safe evaluation (still not recommended for production)
      return new Function(`return ${evaluableCondition}`)();
    } catch {
      return false;
    }
  };

  // Reset all variables to initial values
  const resetAllVariables = useCallback(() => {
    setSimulatedVariables(prev =>
      prev.map(variable => ({
        ...variable,
        value: variable.initialValue,
        hasChanged: false
      }))
    );
    
    setCharacterRelationships(prev =>
      prev.map(rel => ({
        ...rel,
        relationshipLevel: 0,
        relationshipType: 'neutral',
        lastInteraction: undefined
      }))
    );
  }, []);

  // Save current state as preset
  const saveAsPreset = useCallback(() => {
    const presetName = prompt('Enter preset name:');
    if (!presetName) return;

    const preset = {
      name: presetName,
      description: `Saved on ${new Date().toLocaleString()}`,
      variables: simulatedVariables.reduce((acc, variable) => {
        acc[variable.name] = variable.value;
        return acc;
      }, {} as Record<string, any>)
    };

    setSimulationPresets(prev => [...prev, preset]);
  }, [simulatedVariables]);

  // Load preset
  const loadPreset = useCallback((preset: typeof simulationPresets[0]) => {
    setSimulatedVariables(prev =>
      prev.map(variable => ({
        ...variable,
        value: preset.variables[variable.name] ?? variable.value,
        hasChanged: preset.variables[variable.name] !== variable.initialValue
      }))
    );
  }, []);

  // Filter variables by category
  const filteredVariables = useMemo(() => {
    return activeCategory === 'all' 
      ? simulatedVariables 
      : simulatedVariables.filter(v => v.category === activeCategory);
  }, [simulatedVariables, activeCategory]);

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  // Render variable input based on type
  const renderVariableInput = (variable: SimulatedVariable) => {
    const commonProps = {
      className: "w-full px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500",
      onChange: (e: any) => {
        let value = e.target.value;
        if (variable.dataType === 'number') {
          value = parseFloat(value) || 0;
        } else if (variable.dataType === 'boolean') {
          value = e.target.checked;
        }
        handleVariableChange(variable.id, value);
      }
    };

    switch (variable.dataType) {
      case 'boolean':
        return (
          <button
            onClick={() => handleVariableChange(variable.id, !variable.value)}
            className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
              variable.value 
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {variable.value ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            {variable.value ? 'True' : 'False'}
          </button>
        );
      
      case 'number':
      case 'relationship_level':
        return (
          <div className="space-y-2">
            <input
              type="range"
              min={variable.dataType === 'relationship_level' ? -100 : 0}
              max={variable.dataType === 'relationship_level' ? 100 : 100}
              value={variable.value || 0}
              {...commonProps}
              className="w-full slider"
            />
            <input
              type="number"
              value={variable.value || 0}
              {...commonProps}
            />
          </div>
        );
      
      case 'string':
        return (
          <input
            type="text"
            value={variable.value || ''}
            {...commonProps}
          />
        );
      
      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={variable.value || ''}
            {...commonProps}
          />
        );
      
      case 'array':
        return (
          <textarea
            value={Array.isArray(variable.value) ? variable.value.join(', ') : ''}
            placeholder="Enter comma-separated values"
            rows={2}
            {...commonProps}
            onChange={(e) => {
              const arrayValue = e.target.value.split(',').map(v => v.trim()).filter(v => v);
              handleVariableChange(variable.id, arrayValue);
            }}
          />
        );
      
      default:
        return (
          <textarea
            value={typeof variable.value === 'object' ? JSON.stringify(variable.value, null, 2) : variable.value || ''}
            rows={3}
            {...commonProps}
            onChange={(e) => {
              try {
                const objectValue = JSON.parse(e.target.value);
                handleVariableChange(variable.id, objectValue);
              } catch {
                handleVariableChange(variable.id, e.target.value);
              }
            }}
          />
        );
    }
  };

  return (
    <div className="variable-state-simulator h-full bg-white dark:bg-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Variable Simulator
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLivePreview(!isLivePreview)}
              className={`p-1.5 rounded transition-colors ${
                isLivePreview
                  ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
              title="Live Preview"
            >
              {isLivePreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            
            <button
              onClick={resetAllVariables}
              className="p-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Reset All"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            <button
              onClick={saveAsPreset}
              className="p-1.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              title="Save Preset"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'all', label: 'All', icon: List },
            { id: 'story', label: 'Story', icon: Type },
            { id: 'character', label: 'Character', icon: Users },
            { id: 'relationship', label: 'Relationships', icon: Heart },
            { id: 'inventory', label: 'Inventory', icon: Package }
          ].map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id as any)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors whitespace-nowrap ${
                activeCategory === category.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <category.icon className="w-3 h-3" />
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Variables Section */}
        <div className="space-y-3">
          <button
            onClick={() => toggleSection('variables')}
            className="w-full flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Story Variables ({filteredVariables.length})
              </span>
            </div>
            {expandedSections.has('variables') ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.has('variables') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                {filteredVariables.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Sliders className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No variables found for this category</p>
                    <p className="text-sm">Add variables to your StoryMap to see them here</p>
                  </div>
                ) : (
                  filteredVariables.map((variable) => (
                    <motion.div
                      key={variable.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 border rounded-lg ${
                        variable.hasChanged
                          ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                              {variable.name}
                            </h4>
                            {variable.hasChanged && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          {variable.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {variable.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
                              {variable.dataType}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
                              {variable.scope}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        {renderVariableInput(variable)}
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Character Relationships Section */}
        {activeCategory === 'all' || activeCategory === 'relationship' && (
          <div className="space-y-3">
            <button
              onClick={() => toggleSection('relationships')}
              className="w-full flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Character Relationships ({characterRelationships.length})
                </span>
              </div>
              {expandedSections.has('relationships') ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>

            <AnimatePresence>
              {expandedSections.has('relationships') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  {characterRelationships.map((relationship) => (
                    <div
                      key={relationship.characterId}
                      className="p-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {relationship.characterName}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded ${
                          relationship.relationshipType === 'love' ? 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300' :
                          relationship.relationshipType === 'friend' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                          relationship.relationshipType === 'enemy' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          {relationship.relationshipType}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={relationship.relationshipLevel}
                          onChange={(e) => handleRelationshipChange(relationship.characterId, parseInt(e.target.value))}
                          className="w-full slider"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Enemy (-100)</span>
                          <span className="font-medium">
                            {relationship.relationshipLevel}
                          </span>
                          <span>Love (100)</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Conditional Rules Section */}
        {conditionalRules.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => toggleSection('conditions')}
              className="w-full flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Active Conditions ({conditionalRules.filter(r => r.isActive).length}/{conditionalRules.length})
                </span>
              </div>
              {expandedSections.has('conditions') ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>

            <AnimatePresence>
              {expandedSections.has('conditions') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  {conditionalRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`p-3 border rounded-lg ${
                        rule.isActive
                          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {rule.isActive ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {rule.description}
                          </p>
                          <code className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mt-1 block">
                            {rule.condition}
                          </code>
                          {rule.affectedElements.length > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Affects: {rule.affectedElements.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Simulation Presets */}
        {simulationPresets.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => toggleSection('presets')}
              className="w-full flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-500" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Saved Presets ({simulationPresets.length})
                </span>
              </div>
              {expandedSections.has('presets') ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>

            <AnimatePresence>
              {expandedSections.has('presets') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  {simulationPresets.map((preset, index) => (
                    <div
                      key={index}
                      className="p-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {preset.name}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {preset.description}
                          </p>
                        </div>
                        <button
                          onClick={() => loadPreset(preset)}
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default VariableStateSimulator;