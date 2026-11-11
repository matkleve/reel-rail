/**
 * The keyboard throws the deck's top card the way a finger does. Events
 * rather than a store action: the throw is an animation the deck owns, and
 * the keyboard hook must not reach into its state.
 */
export const THROW = "reel:throw";
export const UNDO_THROW = "reel:undo-throw";
