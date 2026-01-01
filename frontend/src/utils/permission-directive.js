import store from '@/store'

export default {
  mounted(el, binding) {
    const { value } = binding
    const can = store.getters.can
    
    console.log('Permission check:', value, 'Result:', can(value))
    console.log('User:', store.state.user)
    
    if (value && !can(value)) {
      el.style.display = 'none'
    }
  },
  
  updated(el, binding) {
    const { value } = binding
    const can = store.getters.can
    
    console.log('Permission update:', value, 'Result:', can(value))
    
    if (value && !can(value)) {
      el.style.display = 'none'
    } else {
      el.style.display = ''
    }
  }
}